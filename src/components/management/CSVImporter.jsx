import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function CSVImporter({ teachers = [], onImportComplete }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    full_name: '',
    email: '',
    phone: '',
    assigned_teacher: ''
  });
  const [headers, setHeaders] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], data: [] };

    // Parse headers
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length > 0 && values.some(v => v.trim())) {
        const row = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx] || '';
        });
        data.push(row);
      }
    }

    return { headers, data };
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const { headers: csvHeaders, data } = parseCSV(text);
      setHeaders(csvHeaders);
      setParsedData(data);

      // Auto-detect column mappings
      const autoMapping = { full_name: '', email: '', phone: '', assigned_teacher: '' };
      csvHeaders.forEach(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('name') || lowerHeader.includes('שם')) {
          autoMapping.full_name = header;
        } else if (lowerHeader.includes('email') || lowerHeader.includes('mail') || lowerHeader.includes('מייל')) {
          autoMapping.email = header;
        } else if (lowerHeader.includes('phone') || lowerHeader.includes('טלפון') || lowerHeader.includes('tel')) {
          autoMapping.phone = header;
        } else if (lowerHeader.includes('teacher') || lowerHeader.includes('מורה')) {
          autoMapping.assigned_teacher = header;
        }
      });
      setColumnMapping(autoMapping);
    };
    reader.readAsText(selectedFile);
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      const batchId = `import_${Date.now()}`;
      const importDate = new Date().toISOString();
      
      const records = parsedData.map(row => {
        const email = row[columnMapping.email]?.trim().toLowerCase();
        if (!email) return null;

        // Find teacher by name if assigned_teacher column exists
        let teacherId = selectedTeacherId;
        let teacherName = '';
        
        if (columnMapping.assigned_teacher && row[columnMapping.assigned_teacher]) {
          const teacherNameFromCSV = row[columnMapping.assigned_teacher].trim();
          const matchedTeacher = teachers.find(t => 
            t.full_name?.toLowerCase().includes(teacherNameFromCSV.toLowerCase()) ||
            teacherNameFromCSV.toLowerCase().includes(t.full_name?.toLowerCase() || '')
          );
          if (matchedTeacher) {
            teacherId = matchedTeacher.id;
            teacherName = matchedTeacher.full_name;
          } else {
            teacherName = teacherNameFromCSV;
          }
        } else if (selectedTeacherId) {
          const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
          teacherName = selectedTeacher?.full_name || '';
        }

        return {
          full_name: row[columnMapping.full_name]?.trim() || '',
          email: email,
          phone: row[columnMapping.phone]?.trim() || '',
          assigned_teacher_id: teacherId || null,
          assigned_teacher_name: teacherName,
          import_batch: batchId,
          import_date: importDate,
          is_registered: false,
          registered_user_id: null
        };
      }).filter(Boolean);

      if (records.length === 0) {
        throw new Error('No valid records to import. Please check email column mapping.');
      }

      // Bulk create references
      await base44.entities.Reference.bulkCreate(records);

      return { count: records.length, batchId };
    },
    onSuccess: (result) => {
      setImportResult({ success: true, count: result.count });
      queryClient.invalidateQueries({ queryKey: ['references'] });
      if (onImportComplete) onImportComplete();
      
      // Reset form
      setFile(null);
      setParsedData([]);
      setHeaders([]);
      setColumnMapping({ full_name: '', email: '', phone: '', assigned_teacher: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (error) => {
      setImportResult({ success: false, error: error.message });
    }
  });

  const handleImport = () => {
    if (!columnMapping.email) {
      setImportResult({ success: false, error: 'Please map the Email column' });
      return;
    }
    importMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="pt-6">
          <div 
            className="text-center py-8 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-700 mb-2">
              {file ? file.name : 'Click to upload CSV or Excel file'}
            </p>
            <p className="text-sm text-gray-500">
              Supports .csv, .xls, .xlsx files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      {headers.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              Map Columns ({parsedData.length} rows found)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name Column *</Label>
                <Select
                  value={columnMapping.full_name}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, full_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email Column * (Required)</Label>
                <Select
                  value={columnMapping.email}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, email: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Phone Column</Label>
                <Select
                  value={columnMapping.phone}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, phone: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assigned Teacher Column</Label>
                <Select
                  value={columnMapping.assigned_teacher}
                  onValueChange={(value) => setColumnMapping({ ...columnMapping, assigned_teacher: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- None --</SelectItem>
                    {headers.map(header => (
                      <SelectItem key={header} value={header}>{header}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Default Teacher Selection */}
            <div className="mt-4">
              <Label>Default Teacher (if not specified in CSV)</Label>
              <Select
                value={selectedTeacherId}
                onValueChange={setSelectedTeacherId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select default teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>-- No default --</SelectItem>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.full_name || teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preview */}
            {parsedData.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-700 mb-2">Preview (first 5 rows)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-left py-2 px-3">Phone</th>
                        <th className="text-left py-2 px-3">Teacher</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3">{row[columnMapping.full_name] || '-'}</td>
                          <td className="py-2 px-3">{row[columnMapping.email] || '-'}</td>
                          <td className="py-2 px-3">{row[columnMapping.phone] || '-'}</td>
                          <td className="py-2 px-3">{row[columnMapping.assigned_teacher] || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleImport}
                disabled={!columnMapping.email || importMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600 gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Import {parsedData.length} Users
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Message */}
      {importResult && (
        <Card className={`border-2 ${importResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {importResult.success ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Import Successful!</p>
                    <p className="text-sm text-green-700">{importResult.count} users imported to Reference list</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Import Failed</p>
                    <p className="text-sm text-red-700">{importResult.error}</p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
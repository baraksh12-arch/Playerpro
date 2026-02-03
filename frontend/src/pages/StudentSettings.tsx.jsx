import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Phone, Music, Award, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/Layout';

export default function StudentSettings() {
  const { t, lang, setLang } = useI18n();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('beginner');
  const [mainStyle, setMainStyle] = useState('rock');
  const [instrumentType, setInstrumentType] = useState('acoustic');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setPhone(user.phone || '');
      setLevel(user.level || 'beginner');
      setMainStyle(user.main_style || 'rock');
      setInstrumentType(user.instrument_type || 'acoustic');
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      alert(t('page.settings.saveSuccess'));
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({
      full_name: fullName,
      phone,
      level,
      main_style: mainStyle,
      instrument_type: instrumentType,
    });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!user) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('page.settings.title')}</h1>
          <p className="text-gray-600">{t('page.settings.subtitle')}</p>
        </div>

        {/* Profile Information */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              {t('page.settings.profileInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('page.settings.fullName')} *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10 h-12"
                  placeholder={t('page.settings.fullNamePlaceholder')}
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('page.settings.email')}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="pl-10 h-12 bg-gray-50"
                />
              </div>
              <p className="text-xs text-gray-500">{t('page.settings.emailNote')}</p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('page.settings.phone')}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10 h-12"
                  placeholder={t('page.settings.phonePlaceholder')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Musical Preferences */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-600" />
              {t('page.settings.musicalPreferences')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Skill Level */}
            <div className="space-y-2">
              <Label htmlFor="level">{t('page.settings.skillLevel')}</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger id="level" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">{t('page.settings.beginner')}</SelectItem>
                  <SelectItem value="intermediate">{t('page.settings.intermediate')}</SelectItem>
                  <SelectItem value="advanced">{t('page.settings.advanced')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Main Style */}
            <div className="space-y-2">
              <Label htmlFor="mainStyle">{t('page.settings.mainStyle')}</Label>
              <Select value={mainStyle} onValueChange={setMainStyle}>
                <SelectTrigger id="mainStyle" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rock">Rock</SelectItem>
                  <SelectItem value="blues">Blues</SelectItem>
                  <SelectItem value="jazz">Jazz</SelectItem>
                  <SelectItem value="classical">Classical</SelectItem>
                  <SelectItem value="metal">Metal</SelectItem>
                  <SelectItem value="folk">Folk</SelectItem>
                  <SelectItem value="pop">Pop</SelectItem>
                  <SelectItem value="flamenco">Flamenco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Instrument Type */}
            <div className="space-y-2">
              <Label htmlFor="instrumentType">{t('page.settings.instrumentType')}</Label>
              <Select value={instrumentType} onValueChange={setInstrumentType}>
                <SelectTrigger id="instrumentType" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acoustic">Acoustic Guitar</SelectItem>
                  <SelectItem value="electric">Electric Guitar</SelectItem>
                  <SelectItem value="classical">Classical Guitar</SelectItem>
                  <SelectItem value="bass">Bass Guitar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🌍 {t('page.settings.languageSettings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="language">{t('common.language')}</Label>
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger id="language" className="h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">🇺🇸 English</SelectItem>
                  <SelectItem value="he">🇮🇱 עברית (Hebrew)</SelectItem>
                  <SelectItem value="ru">🇷🇺 Русский (Russian)</SelectItem>
                  <SelectItem value="fr">🇫🇷 Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button
            onClick={handleSaveProfile}
            disabled={updateProfileMutation.isPending}
            className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-lg font-bold"
          >
            {updateProfileMutation.isPending ? t('common.loading') : t('common.save')}
          </Button>
        </div>

        {/* Logout */}
        <Card className="border-red-200 bg-red-50 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{t('page.settings.logoutTitle')}</h3>
                <p className="text-sm text-gray-600">{t('page.settings.logoutDesc')}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="h-12 px-6"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('nav.logout')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              {t('page.settings.aboutApp')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Guitar Studio Hub</strong></p>
              <p>{t('page.settings.aboutDesc')}</p>
              <p className="text-xs text-gray-500 mt-4">Version 1.0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Music2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BackingTrackPlayer from '@/components/practice/BackingTrackPlayer';

export default function StudentBackingTrack() {
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(null);

  // Fetch user and their recommendations (backing tracks)
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['backingTracks', user?.id],
    queryFn: async () => {
      const allRecs = await base44.entities.Recommendation.list();
      return allRecs.filter(r => !r.student_id || r.student_id === user?.id);
    },
    enabled: !!user,
  });

  // If a track is selected, show the full-screen player
  if (selectedTrackIndex !== null && recommendations[selectedTrackIndex]) {
    const selectedTrack = recommendations[selectedTrackIndex];
    return (
      <BackingTrackPlayer
        youtubeUrl={selectedTrack.youtube_url}
        title={`${selectedTrack.title} – ${selectedTrack.artist_name}`}
        onClose={() => setSelectedTrackIndex(null)}
        playlist={recommendations}
        currentIndex={selectedTrackIndex}
        onTrackChange={(newIndex) => setSelectedTrackIndex(newIndex)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('StudentPractice')}>
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Backing Tracks</h1>
            <p className="text-white/50">Play along with your teacher's picks</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && recommendations.length === 0 && (
          <div className="bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto mb-6">
              <Radio className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Backing Tracks Yet</h3>
            <p className="text-white/50">Your teacher will assign backing tracks for you to practice with.</p>
          </div>
        )}

        {/* Track List */}
        {!isLoading && recommendations.length > 0 && (
          <div className="space-y-3">
            {recommendations.map((track) => (
              <button
                key={track.id}
                onClick={() => setSelectedTrackIndex(recommendations.indexOf(track))}
                className="w-full bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 p-5 flex items-center gap-4 hover:bg-white/5 hover:border-cyan-500/30 transition-all group"
              >
                {/* Thumbnail / Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:from-cyan-500 group-hover:to-blue-600 transition-all">
                  <Music2 className="w-7 h-7 text-cyan-400 group-hover:text-white transition-colors" />
                </div>

                {/* Track Info */}
                <div className="flex-1 text-left">
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {track.title}
                  </h3>
                  <p className="text-white/50">{track.artist_name}</p>
                  {track.note && (
                    <p className="text-sm text-cyan-400/70 mt-1 line-clamp-1">{track.note}</p>
                  )}
                </div>

                {/* Play Icon */}
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-5 h-5 text-cyan-400 ml-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center">
          <p className="text-white/30 text-sm">
            Tap a track to open the full-screen practice player
          </p>
        </div>
      </div>
    </div>
  );
}
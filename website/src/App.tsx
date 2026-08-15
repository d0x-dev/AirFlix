import { useEffect, useState } from 'react';
import { Download, Code, Star, GitFork, PlayCircle, Layers, Shield, Smartphone } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';

interface Asset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Asset[];
}

function App() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/d0x-dev/AirFlix/releases')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch releases');
        return res.json();
      })
      .then((data) => {
        setReleases(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const latestRelease = releases.length > 0 ? releases[0] : null;
  const previousReleases = releases.length > 1 ? releases.slice(1) : [];

  const getApkAsset = (release: Release) => {
    return release.assets.find(a => a.name.endsWith('.apk') && a.name.toLowerCase().includes('universal')) 
        || release.assets.find(a => a.name.endsWith('.apk'));
  };

  const latestApk = latestRelease ? getApkAsset(latestRelease) : null;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-sans">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed w-full z-50 glass-card !rounded-none !border-t-0 !border-x-0 bg-surface/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surfaceAlt border border-primary/30 flex items-center justify-center">
                <PlayCircle className="text-primary w-6 h-6" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                AirFlix
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a href="https://github.com/d0x-dev/AirFlix" target="_blank" rel="noreferrer" className="text-gray-300 hover:text-white transition-colors">
                <Code className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-gray-300">
              {latestRelease ? `v${latestRelease.tag_name} is now available!` : 'Advanced Ad-Free Media Streaming'}
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Experience Media <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Like Never Before
            </span>
          </h1>
          
          <p className="mt-4 max-w-2xl text-xl text-gray-400 mx-auto mb-10">
            An open-source Android application natively built for performance and an immersive, ad-free viewing experience.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {loading ? (
               <div className="animate-pulse bg-primary/20 h-14 w-48 rounded-xl"></div>
            ) : latestApk ? (
              <a
                href={latestApk.browser_download_url}
                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-primary text-background font-bold rounded-xl overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_40px_-10px_#38bdf8]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <Download className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Download APK</span>
                <span className="relative z-10 text-xs opacity-80">({(latestApk.size / 1024 / 1024).toFixed(1)} MB)</span>
              </a>
            ) : (
              <div className="px-8 py-4 bg-surfaceAlt text-gray-400 font-bold rounded-xl border border-white/10">
                Release not found
              </div>
            )}
            
            <a
              href="https://github.com/d0x-dev/AirFlix"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 glass-card font-bold hover:bg-white/5 transition-colors"
            >
              <Code className="w-5 h-5" />
              View Source
            </a>
          </div>

          <div className="mt-12 flex justify-center gap-8 text-gray-400">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <span>Android 6.0+</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-secondary" />
              <span>Ad-Free</span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span>Custom Providers</span>
            </div>
          </div>
        </section>

        {/* Latest Release Notes */}
        {latestRelease && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="glass-card p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Star className="w-48 h-48 text-primary" />
              </div>
              <h2 className="text-3xl font-bold mb-2">What's New in {latestRelease.name || latestRelease.tag_name}</h2>
              <p className="text-primary mb-8 font-medium">Released on {format(new Date(latestRelease.published_at), 'MMMM do, yyyy')}</p>
              
              <div className="prose prose-invert prose-p:text-gray-300 prose-a:text-primary hover:prose-a:text-secondary max-w-none">
                <ReactMarkdown>{latestRelease.body}</ReactMarkdown>
              </div>
            </div>
          </section>
        )}

        {/* Previous Releases */}
        {previousReleases.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mb-20">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <GitFork className="text-secondary" />
              Previous Versions
            </h3>
            <div className="flex flex-col gap-4">
              {previousReleases.map(release => {
                const apk = getApkAsset(release);
                return (
                  <div key={release.id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-white/5">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-1">{release.name || release.tag_name}</h4>
                      <p className="text-sm text-gray-400">{format(new Date(release.published_at), 'MMM do, yyyy')}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <a 
                        href={release.html_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Release Notes
                      </a>
                      {apk ? (
                        <a 
                          href={apk.browser_download_url}
                          className="px-4 py-2 bg-surfaceAlt hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download APK
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500">No APK</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/10 bg-surface/50 py-8 text-center text-gray-400">
        <p>AirFlix is open-source and free forever.</p>
        <p className="text-sm mt-2">Developed by Darkboy & Venom</p>
      </footer>
    </div>
  );
}

export default App;

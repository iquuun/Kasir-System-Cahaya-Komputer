import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-muted-foreground text-sm font-medium animate-pulse">Memuat halaman...</p>
    </div>
  );
}

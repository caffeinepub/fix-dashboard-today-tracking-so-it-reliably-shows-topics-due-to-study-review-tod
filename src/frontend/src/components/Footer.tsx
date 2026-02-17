import { Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        <p className="text-center text-sm text-muted-foreground">
          © 2025. Built with <Heart className="inline h-4 w-4 text-red-500" /> using{' '}
          <a href="https://caffeine.ai" target="_blank" rel="noopener noreferrer" className="font-medium hover:text-foreground transition-colors">
            caffeine.ai
          </a>
        </p>
      </div>
    </footer>
  );
}

import { Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmailThumbnailProps {
  htmlContent?: string;
  subject: string;
  className?: string;
  onClick?: () => void;
}

export const EmailThumbnail: React.FC<EmailThumbnailProps> = ({
  htmlContent,
  subject,
  className,
  onClick
}) => {
  return (
    <div
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-lg border bg-card hover:shadow-lg transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      {htmlContent ? (
        <div className="relative w-full h-full overflow-hidden bg-white">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full pointer-events-none scale-[0.25] origin-top-left"
            style={{
              width: '400%',
              height: '400%',
            }}
            sandbox="allow-same-origin"
            title={subject}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Mail className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
      
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <p className="text-xs font-medium line-clamp-2">{subject}</p>
      </div>
    </div>
  );
};

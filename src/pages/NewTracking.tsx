import { TrackingCreator } from '@/components/TrackingCreator';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NewTracking = () => {
  const navigate = useNavigate();

  const handleTrackingCreated = () => {
    navigate('/app/senders');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Acompanhamento</h1>
          <p className="text-muted-foreground">
            Crie um email único para monitorar newsletters
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <TrackingCreator onTrackingCreated={handleTrackingCreated} />
      </div>
    </div>
  );
};

export default NewTracking;

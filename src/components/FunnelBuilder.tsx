import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Search, Filter, Inbox, GitBranch, ArrowRight, 
  Clock, Mail, Trash2, X, Plus, Eye 
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FunnelEmailCard, StaticFunnelEmailCard, type FunnelEmailCardData } from '@/components/FunnelEmailCard';
import { EmailCategoryBadge } from '@/components/EmailCategoryBadge';
import { differenceInHours, differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FunnelBuilderProps {
  selectedEmailIds: string[];
  onEmailsChange: (emailIds: string[]) => void;
  funnelColor?: string;
}

// Droppable container for the timeline
const TimelineDropZone: React.FC<{ children: React.ReactNode; isEmpty: boolean }> = ({ 
  children, 
  isEmpty 
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'timeline-drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[400px] rounded-lg border-2 border-dashed transition-all",
        isEmpty && "flex items-center justify-center",
        isOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
      )}
    >
      {isEmpty ? (
        <div className="text-center p-8">
          <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="font-medium text-muted-foreground mb-2">
            Arraste emails aqui
          </h4>
          <p className="text-sm text-muted-foreground/70">
            Selecione emails da lista à esquerda e arraste para criar sua sequência
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export const FunnelBuilder: React.FC<FunnelBuilderProps> = ({
  selectedEmailIds,
  onEmailsChange,
  funnelColor = '#3b82f6',
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [senderFilter, setSenderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState<FunnelEmailCardData | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all available emails
  const { data: allEmails, isLoading } = useQuery({
    queryKey: ['funnel-builder-emails'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('id, from_email, from_name, subject, html_content, received_at, category, ctas')
        .order('received_at', { ascending: false });

      if (error) throw error;
      return data as FunnelEmailCardData[];
    },
    enabled: !!user,
  });

  // Get unique senders for filter
  const uniqueSenders = useMemo(() => {
    if (!allEmails) return [];
    const senderMap = new Map<string, string>();
    allEmails.forEach(email => {
      if (!senderMap.has(email.from_email)) {
        senderMap.set(email.from_email, email.from_name || email.from_email);
      }
    });
    return Array.from(senderMap.entries()).map(([email, name]) => ({ email, name }));
  }, [allEmails]);

  // Get unique categories for filter
  const uniqueCategories = useMemo(() => {
    if (!allEmails) return [];
    const categories = new Set<string>();
    allEmails.forEach(email => {
      if (email.category) categories.add(email.category);
    });
    return Array.from(categories);
  }, [allEmails]);

  // Filter available emails (not already selected)
  const availableEmails = useMemo(() => {
    if (!allEmails) return [];
    
    return allEmails.filter(email => {
      // Exclude already selected
      if (selectedEmailIds.includes(email.id)) return false;
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !email.subject.toLowerCase().includes(query) &&
          !email.from_email.toLowerCase().includes(query) &&
          !(email.from_name?.toLowerCase().includes(query))
        ) {
          return false;
        }
      }
      
      // Apply sender filter
      if (senderFilter !== 'all' && email.from_email !== senderFilter) {
        return false;
      }
      
      // Apply category filter
      if (categoryFilter !== 'all' && email.category !== categoryFilter) {
        return false;
      }
      
      return true;
    });
  }, [allEmails, selectedEmailIds, searchQuery, senderFilter, categoryFilter]);

  // Get selected emails in order
  const selectedEmails = useMemo(() => {
    if (!allEmails) return [];
    return selectedEmailIds
      .map(id => allEmails.find(e => e.id === id))
      .filter((e): e is FunnelEmailCardData => e !== undefined);
  }, [allEmails, selectedEmailIds]);

  // Calculate timeline stats
  const timelineStats = useMemo(() => {
    if (selectedEmails.length < 2) return null;
    
    const sortedByDate = [...selectedEmails].sort(
      (a, b) => new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
    );
    
    const firstDate = new Date(sortedByDate[0].received_at);
    const lastDate = new Date(sortedByDate[sortedByDate.length - 1].received_at);
    const totalDays = differenceInDays(lastDate, firstDate);
    
    let totalHours = 0;
    for (let i = 1; i < sortedByDate.length; i++) {
      totalHours += differenceInHours(
        new Date(sortedByDate[i].received_at),
        new Date(sortedByDate[i - 1].received_at)
      );
    }
    const avgInterval = Math.round(totalHours / (sortedByDate.length - 1));
    
    return { totalDays, avgInterval, firstDate };
  }, [selectedEmails]);

  // Find the active email being dragged
  const activeEmail = useMemo(() => {
    if (!activeId || !allEmails) return null;
    return allEmails.find(e => e.id === activeId);
  }, [activeId, allEmails]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // If dragging from available to timeline
    if (!selectedEmailIds.includes(activeId) && 
        (overId === 'timeline-drop-zone' || selectedEmailIds.includes(overId))) {
      // Will add on drag end
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Adding new email to timeline
    if (!selectedEmailIds.includes(activeId)) {
      if (overId === 'timeline-drop-zone') {
        onEmailsChange([...selectedEmailIds, activeId]);
      } else if (selectedEmailIds.includes(overId)) {
        // Insert at specific position
        const overIndex = selectedEmailIds.indexOf(overId);
        const newIds = [...selectedEmailIds];
        newIds.splice(overIndex, 0, activeId);
        onEmailsChange(newIds);
      }
    } 
    // Reordering within timeline
    else if (selectedEmailIds.includes(activeId) && selectedEmailIds.includes(overId)) {
      const oldIndex = selectedEmailIds.indexOf(activeId);
      const newIndex = selectedEmailIds.indexOf(overId);
      
      if (oldIndex !== newIndex) {
        onEmailsChange(arrayMove(selectedEmailIds, oldIndex, newIndex));
      }
    }
  };

  const removeFromTimeline = (emailId: string) => {
    onEmailsChange(selectedEmailIds.filter(id => id !== emailId));
  };

  const clearTimeline = () => {
    onEmailsChange([]);
  };

  const addToTimeline = (emailId: string) => {
    if (!selectedEmailIds.includes(emailId)) {
      onEmailsChange([...selectedEmailIds, emailId]);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 min-h-[500px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
        <Skeleton className="h-full" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[500px]">
        {/* Available Emails Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              E-mails Disponíveis
              <Badge variant="secondary">{availableEmails.length}</Badge>
            </h3>
          </div>

          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto ou remetente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={senderFilter} onValueChange={setSenderFilter}>
                <SelectTrigger className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Remetente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os remetentes</SelectItem>
                  {uniqueSenders.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {uniqueCategories.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Email Grid */}
          <ScrollArea className="h-[400px] pr-4">
            {availableEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Mail className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery || senderFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Nenhum e-mail encontrado com os filtros aplicados'
                    : 'Todos os e-mails já foram adicionados à timeline'}
                </p>
              </div>
            ) : (
              <SortableContext items={availableEmails.map(e => e.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-2 gap-3">
                  {availableEmails.map((email) => (
                    <div key={email.id} className="relative group">
                      <FunnelEmailCard
                        email={email}
                        isDraggable={true}
                        onClick={() => setPreviewEmail(email)}
                      />
                      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewEmail(email);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToTimeline(email.id);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            )}
          </ScrollArea>
        </div>

        {/* Timeline Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Timeline do Funil
              <Badge variant="secondary">{selectedEmailIds.length}</Badge>
            </h3>
            {selectedEmailIds.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearTimeline}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Timeline Stats */}
          {timelineStats && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Duração: <strong className="text-foreground">{timelineStats.totalDays} dias</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Intervalo médio: <strong className="text-foreground">{timelineStats.avgInterval}h</strong></span>
              </div>
            </div>
          )}

          {/* Droppable Timeline Area */}
          <TimelineDropZone isEmpty={selectedEmailIds.length === 0}>
            <ScrollArea className="h-[400px] pr-4">
              <SortableContext items={selectedEmailIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-3 p-4">
                  {selectedEmails.map((email, index) => {
                    const prevEmail = selectedEmails[index - 1];
                    const hoursSincePrev = prevEmail
                      ? differenceInHours(new Date(email.received_at), new Date(prevEmail.received_at))
                      : 0;

                    return (
                      <div key={email.id}>
                        {/* Interval indicator */}
                        {index > 0 && (
                          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
                            <div className="h-px flex-1 bg-border" />
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted">
                              <Clock className="h-3 w-3" />
                              +{hoursSincePrev}h
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}
                        
                        <div className="relative group">
                          <FunnelEmailCard
                            email={email}
                            isDraggable={true}
                            isInTimeline={true}
                            index={index}
                            funnelColor={funnelColor}
                            firstEmailDate={timelineStats?.firstDate}
                            onClick={() => setPreviewEmail(email)}
                          />
                          <div className="absolute top-2 right-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewEmail(email);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromTimeline(email.id);
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SortableContext>
            </ScrollArea>
          </TimelineDropZone>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeEmail && (
          <div className="opacity-90">
            <StaticFunnelEmailCard email={activeEmail} />
          </div>
        )}
      </DragOverlay>

      {/* Email Preview Sheet */}
      <Sheet open={!!previewEmail} onOpenChange={(open) => !open && setPreviewEmail(null)}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          {previewEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{previewEmail.subject}</SheetTitle>
                <SheetDescription>
                  {previewEmail.from_name || previewEmail.from_email} • {format(new Date(previewEmail.received_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                {/* Metadata */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">De:</span>
                      <span className="font-medium">{previewEmail.from_name || previewEmail.from_email}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Recebido em:</span>
                      <span className="font-medium">
                        {format(new Date(previewEmail.received_at), "dd 'de' MMMM yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {previewEmail.category && (
                      <div className="flex items-center gap-2 text-sm">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Categoria:</span>
                        <EmailCategoryBadge category={previewEmail.category} />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* CTAs */}
                {Array.isArray(previewEmail.ctas) && previewEmail.ctas.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">CTAs Detectados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {previewEmail.ctas.map((cta: any, idx: number) => (
                          <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="flex-1 space-y-1">
                              <div className="font-medium text-sm">{cta.text}</div>
                              {cta.url && (
                                <a 
                                  href={cta.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:text-primary break-all"
                                >
                                  {cta.url}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Content */}
                <Tabs defaultValue="html" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="html">Visualização HTML</TabsTrigger>
                    <TabsTrigger value="text">Texto</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="html" className="mt-4">
                    <Card>
                      <CardContent className="p-0">
                        {previewEmail.html_content ? (
                          <div className="w-full h-[500px] border rounded-lg overflow-hidden">
                            <iframe
                              srcDoc={previewEmail.html_content}
                              className="w-full h-full"
                              sandbox="allow-same-origin"
                              title="Email Preview"
                            />
                          </div>
                        ) : (
                          <div className="p-8 text-center text-muted-foreground">
                            Conteúdo HTML não disponível
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="text" className="mt-4">
                    <Card>
                      <CardContent className="p-6">
                        <p className="text-muted-foreground text-sm">
                          Use a visualização HTML para ver o conteúdo
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Add to Timeline Button */}
                {!selectedEmailIds.includes(previewEmail.id) && (
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      addToTimeline(previewEmail.id);
                      setPreviewEmail(null);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar à Timeline
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DndContext>
  );
};

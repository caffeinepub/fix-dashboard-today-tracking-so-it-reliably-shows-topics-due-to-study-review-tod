import { useEffect, useState } from 'react';
import { useCreateMainTopic, useUpdateMainTopic, useCreateSubTopic, useUpdateSubTopic, useGetMainTopics } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { Difficulty } from '../backend';
import type { MainTopic, SubTopic } from '../backend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TopicDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mainTopic?: MainTopic | null;
  subTopic?: SubTopic | null;
}

export default function TopicDialog({ open, onOpenChange, mainTopic, subTopic }: TopicDialogProps) {
  const [mode, setMode] = useState<'main' | 'sub'>('main');
  const [mainTopicTitle, setMainTopicTitle] = useState('');
  const [mainTopicDescription, setMainTopicDescription] = useState('');
  const [selectedMainTopicId, setSelectedMainTopicId] = useState<bigint | null>(null);
  const [subTopicTitle, setSubTopicTitle] = useState('');
  const [subTopicDescription, setSubTopicDescription] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.medium);
  const [studyDate, setStudyDate] = useState<Date>(new Date());

  const { data: mainTopics } = useGetMainTopics();
  const createMainTopic = useCreateMainTopic();
  const updateMainTopic = useUpdateMainTopic();
  const createSubTopic = useCreateSubTopic();
  const updateSubTopic = useUpdateSubTopic();

  useEffect(() => {
    if (mainTopic) {
      setMode('main');
      setMainTopicTitle(mainTopic.title);
      setMainTopicDescription(mainTopic.description);
    } else if (subTopic) {
      setMode('sub');
      setSelectedMainTopicId(subTopic.mainTopicId);
      setSubTopicTitle(subTopic.title);
      setSubTopicDescription(subTopic.description);
      setDifficulty(subTopic.difficulty);
      setStudyDate(new Date(Number(subTopic.studyDate / BigInt(1_000_000))));
    } else {
      setMode('main');
      setMainTopicTitle('');
      setMainTopicDescription('');
      setSelectedMainTopicId(null);
      setSubTopicTitle('');
      setSubTopicDescription('');
      setDifficulty(Difficulty.medium);
      setStudyDate(new Date());
    }
  }, [mainTopic, subTopic, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'main') {
      if (!mainTopicTitle.trim()) return;

      if (mainTopic) {
        updateMainTopic.mutate(
          { id: mainTopic.id, title: mainTopicTitle.trim(), description: mainTopicDescription.trim() },
          { onSuccess: () => onOpenChange(false) }
        );
      } else {
        createMainTopic.mutate(
          { title: mainTopicTitle.trim(), description: mainTopicDescription.trim() },
          { onSuccess: () => onOpenChange(false) }
        );
      }
    } else {
      if (!subTopicTitle.trim() || !selectedMainTopicId) return;

      const studyDateNanos = BigInt(studyDate.getTime()) * BigInt(1_000_000);

      if (subTopic) {
        updateSubTopic.mutate(
          { 
            id: subTopic.id, 
            title: subTopicTitle.trim(), 
            description: subTopicDescription.trim(), 
            difficulty, 
            studyDate: studyDateNanos 
          },
          { onSuccess: () => onOpenChange(false) }
        );
      } else {
        createSubTopic.mutate(
          { 
            mainTopicId: selectedMainTopicId, 
            title: subTopicTitle.trim(), 
            description: subTopicDescription.trim(), 
            difficulty, 
            studyDate: studyDateNanos 
          },
          { onSuccess: () => onOpenChange(false) }
        );
      }
    }
  };

  const isPending = createMainTopic.isPending || updateMainTopic.isPending || createSubTopic.isPending || updateSubTopic.isPending;

  const isEditing = !!mainTopic || !!subTopic;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing 
              ? (mainTopic ? 'Edit Main Topic' : 'Edit Subtopic')
              : 'Create New Topic'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the details of your topic.'
              : 'Create a main topic or add a subtopic to organize your revision schedule.'}
          </DialogDescription>
        </DialogHeader>

        {!isEditing ? (
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'main' | 'sub')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="main">Main Topic</TabsTrigger>
              <TabsTrigger value="sub">Subtopic</TabsTrigger>
            </TabsList>

            <TabsContent value="main" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mainTitle">Title</Label>
                  <Input
                    id="mainTitle"
                    placeholder="e.g., Mathematics"
                    value={mainTopicTitle}
                    onChange={(e) => setMainTopicTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mainDescription">Description</Label>
                  <Textarea
                    id="mainDescription"
                    placeholder="Brief description of the main topic area..."
                    value={mainTopicDescription}
                    onChange={(e) => setMainTopicDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!mainTopicTitle.trim() || isPending}>
                    {isPending ? 'Creating...' : 'Create Main Topic'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            <TabsContent value="sub" className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="selectMainTopic">Main Topic</Label>
                  <Select 
                    value={selectedMainTopicId?.toString() || ''} 
                    onValueChange={(value) => setSelectedMainTopicId(BigInt(value))}
                  >
                    <SelectTrigger id="selectMainTopic">
                      <SelectValue placeholder="Select a main topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {mainTopics?.map(mt => (
                        <SelectItem key={mt.id.toString()} value={mt.id.toString()}>
                          {mt.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {mainTopics?.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No main topics available. Create a main topic first.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subTitle">Subtopic Title</Label>
                  <Input
                    id="subTitle"
                    placeholder="e.g., Calculus Basics"
                    value={subTopicTitle}
                    onChange={(e) => setSubTopicTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subDescription">Description</Label>
                  <Textarea
                    id="subDescription"
                    placeholder="Brief description of what you need to revise..."
                    value={subTopicDescription}
                    onChange={(e) => setSubTopicDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
                    <SelectTrigger id="difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Difficulty.easy}>Easy</SelectItem>
                      <SelectItem value={Difficulty.medium}>Medium</SelectItem>
                      <SelectItem value={Difficulty.hard}>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="studyDate">Study Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="studyDate"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {studyDate ? format(studyDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={studyDate}
                        onSelect={(date) => date && setStudyDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    The date when you first studied or plan to study this subtopic
                  </p>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!subTopicTitle.trim() || !selectedMainTopicId || isPending}>
                    {isPending ? 'Creating...' : 'Create Subtopic'}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mainTopic ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="editMainTitle">Title</Label>
                  <Input
                    id="editMainTitle"
                    placeholder="e.g., Mathematics"
                    value={mainTopicTitle}
                    onChange={(e) => setMainTopicTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMainDescription">Description</Label>
                  <Textarea
                    id="editMainDescription"
                    placeholder="Brief description of the main topic area..."
                    value={mainTopicDescription}
                    onChange={(e) => setMainTopicDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Main Topic</Label>
                  <Input
                    value={subTopic?.mainTopicTitle || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSubTitle">Subtopic Title</Label>
                  <Input
                    id="editSubTitle"
                    placeholder="e.g., Calculus Basics"
                    value={subTopicTitle}
                    onChange={(e) => setSubTopicTitle(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editSubDescription">Description</Label>
                  <Textarea
                    id="editSubDescription"
                    placeholder="Brief description of what you need to revise..."
                    value={subTopicDescription}
                    onChange={(e) => setSubTopicDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDifficulty">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(value) => setDifficulty(value as Difficulty)}>
                    <SelectTrigger id="editDifficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Difficulty.easy}>Easy</SelectItem>
                      <SelectItem value={Difficulty.medium}>Medium</SelectItem>
                      <SelectItem value={Difficulty.hard}>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStudyDate">Study Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="editStudyDate"
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {studyDate ? format(studyDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={studyDate}
                        onSelect={(date) => date && setStudyDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

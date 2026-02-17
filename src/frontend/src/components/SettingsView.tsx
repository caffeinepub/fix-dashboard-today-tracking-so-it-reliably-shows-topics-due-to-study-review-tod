import { useState, useEffect } from 'react';
import { useGetUserSettings, useSetUserSettings, useGetDefaultIntervals } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, RotateCcw } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function SettingsView() {
  const { data: settings, isLoading: settingsLoading } = useGetUserSettings();
  const { data: defaults, isLoading: defaultsLoading } = useGetDefaultIntervals();
  const setSettings = useSetUserSettings();

  const [easyIntervals, setEasyIntervals] = useState<string[]>(['7', '21', '45', '90']);
  const [mediumIntervals, setMediumIntervals] = useState<string[]>(['3', '7', '21', '45', '90']);
  const [hardIntervals, setHardIntervals] = useState<string[]>(['1', '3', '7', '21', '45']);
  const [preferredDays, setPreferredDays] = useState<number[]>([]);

  const isLoading = settingsLoading || defaultsLoading;

  useEffect(() => {
    if (defaults && !settings) {
      setEasyIntervals(defaults.easy.map(d => d.toString()));
      setMediumIntervals(defaults.medium.map(d => d.toString()));
      setHardIntervals(defaults.hard.map(d => d.toString()));
    }
  }, [defaults, settings]);

  useEffect(() => {
    if (settings) {
      setEasyIntervals(settings.easyIntervals.map(d => d.toString()));
      setMediumIntervals(settings.mediumIntervals.map(d => d.toString()));
      setHardIntervals(settings.hardIntervals.map(d => d.toString()));
      setPreferredDays(settings.preferredReviewDays.map(d => Number(d)));
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parseIntervals = (intervals: string[]) => 
      intervals
        .map(i => parseInt(i))
        .filter(i => !isNaN(i) && i > 0)
        .map(i => BigInt(i));

    const easy = parseIntervals(easyIntervals);
    const medium = parseIntervals(mediumIntervals);
    const hard = parseIntervals(hardIntervals);

    if (easy.length === 0 || medium.length === 0 || hard.length === 0) {
      return;
    }

    setSettings.mutate({
      easyIntervals: easy,
      mediumIntervals: medium,
      hardIntervals: hard,
      preferredDays: preferredDays.map(d => BigInt(d)),
    });
  };

  const toggleDay = (day: number) => {
    setPreferredDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const addInterval = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (difficulty === 'easy') {
      setEasyIntervals([...easyIntervals, '']);
    } else if (difficulty === 'medium') {
      setMediumIntervals([...mediumIntervals, '']);
    } else {
      setHardIntervals([...hardIntervals, '']);
    }
  };

  const removeInterval = (difficulty: 'easy' | 'medium' | 'hard', index: number) => {
    if (difficulty === 'easy') {
      setEasyIntervals(easyIntervals.filter((_, i) => i !== index));
    } else if (difficulty === 'medium') {
      setMediumIntervals(mediumIntervals.filter((_, i) => i !== index));
    } else {
      setHardIntervals(hardIntervals.filter((_, i) => i !== index));
    }
  };

  const updateInterval = (difficulty: 'easy' | 'medium' | 'hard', index: number, value: string) => {
    if (difficulty === 'easy') {
      const updated = [...easyIntervals];
      updated[index] = value;
      setEasyIntervals(updated);
    } else if (difficulty === 'medium') {
      const updated = [...mediumIntervals];
      updated[index] = value;
      setMediumIntervals(updated);
    } else {
      const updated = [...hardIntervals];
      updated[index] = value;
      setHardIntervals(updated);
    }
  };

  const resetToDefaults = () => {
    if (defaults) {
      setEasyIntervals(defaults.easy.map(d => d.toString()));
      setMediumIntervals(defaults.medium.map(d => d.toString()));
      setHardIntervals(defaults.hard.map(d => d.toString()));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderIntervalInputs = (
    intervals: string[],
    difficulty: 'easy' | 'medium' | 'hard',
    label: string,
    defaultValues: string
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addInterval(difficulty)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Default: {defaultValues} days</p>
      <div className="space-y-2">
        {intervals.map((interval, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              value={interval}
              onChange={(e) => updateInterval(difficulty, index, e.target.value)}
              placeholder="Days"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground">days</span>
            {intervals.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeInterval(difficulty, index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-2">
          Customize your revision intervals and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Revision Intervals</CardTitle>
                <CardDescription>
                  Set the sequence of days between revisions based on topic difficulty
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-3">
                {renderIntervalInputs(easyIntervals, 'easy', 'Easy Topics', '7, 21, 45, 90')}
              </div>
              <div className="space-y-3">
                {renderIntervalInputs(mediumIntervals, 'medium', 'Medium Topics', '3, 7, 21, 45, 90')}
              </div>
              <div className="space-y-3">
                {renderIntervalInputs(hardIntervals, 'hard', 'Hard Topics', '1, 3, 7, 21, 45')}
              </div>
            </div>
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <p className="text-sm text-muted-foreground">
                Each time you review a topic, it progresses to the next interval in the sequence. 
                For example, an easy topic will be reviewed after 7 days, then 21 days, then 45 days, and finally 90 days.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferred Review Days</CardTitle>
            <CardDescription>
              Select the days you prefer to schedule reviews (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {DAYS_OF_WEEK.map(day => (
                <div key={day.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`day-${day.value}`}
                    checked={preferredDays.includes(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                  />
                  <Label
                    htmlFor={`day-${day.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {day.label}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={setSettings.isPending}>
            {setSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TodayView from '../components/TodayView';
import TopicsView from '../components/TopicsView';
import CalendarView from '../components/CalendarView';
import SettingsView from '../components/SettingsView';
import { Calendar, BookOpen, Settings, Home } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('today');

  return (
    <div className="container mx-auto px-4 py-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] lg:mx-auto">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Today</span>
          </TabsTrigger>
          <TabsTrigger value="topics" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Topics</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TodayView />
        </TabsContent>

        <TabsContent value="topics" className="mt-6">
          <TopicsView />
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <CalendarView />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

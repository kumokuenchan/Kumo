import React from 'react';
import { motion } from 'framer-motion';
import { NoteStats } from '../../../types/notes';
import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Archive,
  FileText,
  Command,
  Users,
  Ticket,
  GitBranch,
  Zap
} from 'lucide-react';

interface NoteStatsPanelProps {
  stats: NoteStats;
}

const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bgColor,
  delay = 0 
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: number;
  color: string;
  bgColor: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60"
  >
    <div className="flex items-center gap-3">
      <div className={`w-8 h-8 ${bgColor} rounded-lg flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</p>
      </div>
    </div>
  </motion.div>
);

export default function NoteStatsPanel({ stats }: NoteStatsPanelProps) {
  const typeStats = [
    { label: 'General', value: stats.byType.general, icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
    { label: 'Commands', value: stats.byType.command, icon: Command, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Developer', value: stats.byType.developer, icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Tickets', value: stats.byType.ticket, icon: Ticket, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Release', value: stats.byType.release, icon: GitBranch, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Flows', value: stats.byType.flow, icon: Zap, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  ];

  const statusStats = [
    { label: 'Active', value: stats.byStatus.active, icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Draft', value: stats.byStatus.draft, icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Archived', value: stats.byStatus.archived, icon: Archive, color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Overview</h3>
      </div>

      {/* Total Stats */}
      <div className="space-y-3">
        <StatCard
          icon={FileText}
          label="Total Notes"
          value={stats.total}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          delay={0.1}
        />
        <StatCard
          icon={CheckCircle}
          label="Completed"
          value={stats.completed}
          color="text-green-600"
          bgColor="bg-green-100 dark:bg-green-900/30"
          delay={0.2}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue"
          value={stats.overdue}
          color="text-red-600"
          bgColor="bg-red-100 dark:bg-red-900/30"
          delay={0.3}
        />
        <StatCard
          icon={Clock}
          label="Due This Week"
          value={stats.dueThisWeek}
          color="text-orange-600"
          bgColor="bg-orange-100 dark:bg-orange-900/30"
          delay={0.4}
        />
      </div>

      {/* Type Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">By Type</h4>
        <div className="grid grid-cols-1 gap-2">
          {typeStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              bgColor={stat.bgColor}
              delay={0.5 + index * 0.05}
            />
          ))}
        </div>
      </div>

      {/* Status Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">By Status</h4>
        <div className="grid grid-cols-1 gap-2">
          {statusStats.map((stat, index) => (
            <StatCard
              key={stat.label}
              icon={stat.icon}
              label={stat.label}
              value={stat.value}
              color={stat.color}
              bgColor={stat.bgColor}
              delay={0.8 + index * 0.05}
            />
          ))}
        </div>
      </div>

      {/* Priority Distribution */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">By Priority</h4>
        <div className="grid grid-cols-1 gap-2">
          <StatCard
            icon={TrendingUp}
            label="Low Priority"
            value={stats.byPriority.low}
            color="text-gray-600"
            bgColor="bg-gray-100 dark:bg-gray-700"
            delay={1.0}
          />
          <StatCard
            icon={TrendingUp}
            label="Medium Priority"
            value={stats.byPriority.medium}
            color="text-blue-600"
            bgColor="bg-blue-100 dark:bg-blue-900/30"
            delay={1.05}
          />
          <StatCard
            icon={TrendingUp}
            label="High Priority"
            value={stats.byPriority.high}
            color="text-orange-600"
            bgColor="bg-orange-100 dark:bg-orange-900/30"
            delay={1.1}
          />
          <StatCard
            icon={TrendingUp}
            label="Urgent"
            value={stats.byPriority.urgent}
            color="text-red-600"
            bgColor="bg-red-100 dark:bg-red-900/30"
            delay={1.15}
          />
        </div>
      </div>
    </div>
  );
}

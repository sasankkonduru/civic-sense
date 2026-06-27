/**
 * CivicSense TypeScript types.
 * Defines structure for issues, AI suggestions, statistics, and dashboard data.
 */

export interface AIAnalysis {
  category: 'Pothole' | 'Garbage' | 'Water Leakage' | 'Broken Streetlight' | 'Road Damage' | 'Other' | string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  priority: number; // 1 (Critical) to 5 (Routine)
  explanation: string;
  recommendedAction: string;
  estimatedCost: string;
  confidenceScore?: number; // Confidence score between 0 and 100
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Submitted' | 'Verified' | 'In Progress' | 'Resolved' | 'Reported' | 'Under Review' | 'Assigned' | 'Verified & Closed' | string;
  reporterName: string;
  reporterEmail: string;
  imageUrl?: string;
  createdAt: string;
  priority: number;
  latitude?: number;
  longitude?: number;
  priorityScore?: number; // AI Priority Agent score (1-100)
  priorityLevel?: 'Low' | 'Medium' | 'High' | 'Critical'; // AI Priority level
  priorityReasoning?: string; // AI Priority Agent explanation
  supportCount?: number; // Total supports/upvotes
  supportedBy?: string[]; // Emails or UIDs of supporters
  duplicateProbability?: number; // AI Duplicate Probability (0-100)
  duplicateOf?: string; // ID of the issue this is a duplicate of
  similarIssues?: any[]; // Details of other similar issues found nearby
  isDuplicate?: boolean; // Flagged as duplicate (>80% prob)
  resolutionImage?: string; // The uploaded resolution verification image URL
  department?: string; // Assigned department (City Official action)
  resolutionVerification?: {
    status: 'Resolved' | 'Partially Resolved' | 'Not Resolved';
    confidenceScore: number;
    explanation: string;
    verifiedAt: string;
  };
  aiAnalysis?: AIAnalysis;
}

export interface AIInsight {
  id: string;
  title: string;
  summary: string;
  severity: 'Info' | 'Warning' | 'Urgent';
  suggestedAction: string;
  affectedCategory: string;
  timestamp: string;
  confidenceScore?: number;
}

export interface DashboardStats {
  totalCount: number;
  resolvedCount: number;
  inProgressCount: number;
  pendingCount: number;
  openCount?: number;
  criticalCount?: number;
  avgResolutionTime?: number;
  pendingVerificationCount?: number;
  categoryBreakdown: { category: string; count: number }[];
  severityBreakdown: { severity: string; count: number }[];
  weeklyTrend: { date: string; reported: number; resolved: number }[];
}

export interface User {
  uid?: string;
  email: string;
  name: string;
  picture?: string;
  photoURL?: string;
  role: 'citizen' | 'official';
  createdAt?: string;
}

export interface FirestoreIssue {
  id: string;
  imageUrl: string;
  description: string;
  latitude: number;
  longitude: number;
  status: 'Submitted' | 'Verified' | 'In Progress' | 'Resolved' | string;
  category: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  priority: number;
  createdBy: string;
  createdAt: string;
  
  // Optional display fields for full-stack dashboard compatibility
  title?: string;
  location?: string;
  reporterName?: string;
  reporterEmail?: string;
  priorityScore?: number;
  priorityLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
  priorityReasoning?: string;
  supportCount?: number;
  supportedBy?: string[];
  duplicateProbability?: number;
  duplicateOf?: string;
  similarIssues?: any[];
  isDuplicate?: boolean;
  resolutionImage?: string; // The uploaded resolution verification image URL
  department?: string; // Assigned department (City Official action)
  resolutionVerification?: {
    status: 'Resolved' | 'Partially Resolved' | 'Not Resolved';
    confidenceScore: number;
    explanation: string;
    verifiedAt: string;
  };
  aiAnalysis?: AIAnalysis;
}

export interface MunicipalInsights {
  mostCommonCategory: {
    category: string;
    count: number;
    percentage: number;
    description: string;
  };
  highestRiskZones: {
    zone: string;
    riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' | string;
    activeIssuesCount: number;
    description: string;
  }[];
  resolutionTrends: {
    trend: string;
    percentageChange: string;
    details: string;
  };
  emergingIssues: {
    title: string;
    description: string;
    severity: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  }[];
  recommendedActions: {
    action: string;
    priority: 'Low' | 'Medium' | 'High' | 'Critical' | string;
    timeframe: string;
    impact: string;
  }[];
}

export interface MunicipalDailyBrief {
  totalReportsToday: number;
  emergingTrends: {
    trend: string;
    description: string;
    impactLevel: 'Low' | 'Medium' | 'High' | 'Critical' | string;
  }[];
  highestPriorityArea: {
    locationName: string;
    activeIssuesCount: number;
    primaryRisk: string;
  };
  urgentDepartments: {
    department: string;
    reason: string;
    urgency: 'Medium' | 'High' | 'Critical' | string;
  }[];
  riskForecast: {
    level: 'Low' | 'Medium' | 'High' | 'Critical' | string;
    description: string;
    vulnerableSectors: string[];
  };
  recommendedActions: {
    action: string;
    rationale: string;
    impact: string;
    timeline: string;
  }[];
  predictedIssues7Days: {
    category: string;
    expectedCount: number;
    probability: number;
    factors: string;
  }[];
}


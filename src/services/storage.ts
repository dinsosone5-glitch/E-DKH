import { ASNUser, DailyReport } from '../types';

const USERS_KEY = 'edkh_users_data';
const CURRENT_USER_KEY = 'edkh_current_session';
const REPORTS_KEY = 'edkh_daily_reports';

// Default initial user for instant testing if needed
const DEFAULT_USERS: ASNUser[] = [
  {
    id: 'asn-001',
    namaLengkap: 'Drs. H. M. Ridwan, M.Si',
    nip: '197508152002121003',
    pangkatGol: 'Pembina Utama Muda (IV/c)',
    instansi: 'DINAS_SOSIAL',
    unitKerja: 'BIDANG DAYASOS',
    bidangBagian: 'ESELON',
    password: 'password123',
    createdAt: new Date().toISOString(),
  }
];

export function getStoredUsers(): ASNUser[] {
  const data = localStorage.getItem(USERS_KEY);
  if (!data) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_USERS;
  }
}

export function saveUser(user: ASNUser): void {
  const users = getStoredUsers();
  const existingIdx = users.findIndex(u => u.nip === user.nip);
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser(): ASNUser | null {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function setCurrentUser(user: ASNUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function getStoredReports(): DailyReport[] {
  const data = localStorage.getItem(REPORTS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveReport(report: DailyReport): void {
  const reports = getStoredReports();
  const idx = reports.findIndex(r => r.id === report.id);
  if (idx >= 0) {
    reports[idx] = report;
  } else {
    reports.unshift(report);
  }
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function deleteReport(reportId: string): void {
  const reports = getStoredReports().filter(r => r.id !== reportId);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

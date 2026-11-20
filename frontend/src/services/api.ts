/**
 * API service for VPSMaster Frontend.
 * Communicates with the FastAPI backend with token injection and error interception.
 */

const API_BASE = '/api/v1';

export function getAuthToken(): string | null {
  return localStorage.getItem('vpsmaster_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('vpsmaster_token', token);
}

export function clearAuthToken(): void {
  localStorage.removeItem('vpsmaster_token');
  localStorage.removeItem('vpsmaster_user');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    clearAuthToken();
    window.location.href = '/';
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    let errorDetail = `Request failed (${response.status})`;
    try {
      const text = await response.text();
      try {
        const errorJson = JSON.parse(text);
        errorDetail = errorJson.detail || JSON.stringify(errorJson);
      } catch {
        errorDetail = text || `Error ${response.status}: ${response.statusText}`;
      }
    } catch {
      errorDetail = `Error ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getProfile: () => request<any>('/auth/me'),
  setup2FA: () => request<any>('/auth/2fa/setup', { method: 'POST' }),
  enable2FA: (code: string) => request<any>('/auth/2fa/enable', { method: 'POST', body: JSON.stringify({ totp_code: code }) }),
  disable2FA: (code: string) => request<any>('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ totp_code: code }) }),

  // Dashboard
  getDashboardOverview: () => request<any>('/dashboard/overview'),

  // Server Management
  getServerInfo: () => request<any>('/server/info'),
  setHostname: (hostname: string) => request<any>('/server/hostname', { method: 'POST', body: JSON.stringify({ hostname }) }),
  getTimezone: () => request<any>('/server/timezone'),
  setTimezone: (timezone: string) => request<any>('/server/timezone', { method: 'POST', body: JSON.stringify({ timezone }) }),
  getInterfaces: () => request<any>('/server/interfaces'),
  getUpdates: () => request<any>('/server/updates'),
  runUpdates: () => request<any>('/server/updates/run', { method: 'POST' }),
  rebootServer: () => request<any>('/server/reboot', { method: 'POST' }),
  shutdownServer: () => request<any>('/server/shutdown', { method: 'POST' }),

  // Service Management
  getServices: () => request<any>('/services'),
  serviceAction: (service: string, action: string) => request<any>(`/services/${service}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  getServiceLogs: (service: string, lines = 100) => request<any>(`/services/${service}/logs?lines=${lines}`),

  // Website Management
  getWebsites: () => request<any>('/websites'),
  createWebsite: (data: any) => request<any>('/websites', { method: 'POST', body: JSON.stringify(data) }),
  getWebsite: (id: number) => request<any>(`/websites/${id}`),
  updateWebsite: (id: number, data: any) => request<any>(`/websites/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  suspendWebsite: (id: number, suspend: boolean) => request<any>(`/websites/${id}/suspend?suspend=${suspend}`, { method: 'POST' }),
  deleteWebsite: (id: number, deleteFiles = false) => request<any>(`/websites/${id}?delete_files=${deleteFiles}`, { method: 'DELETE' }),
  getWebsiteLogs: (id: number, type = 'access') => request<any>(`/websites/${id}/logs?log_type=${type}`),

  // Domain & DNS
  getDomains: () => request<any>('/dns/domains'),
  createDomain: (data: any) => request<any>('/dns/domains', { method: 'POST', body: JSON.stringify(data) }),
  getDomain: (id: number) => request<any>(`/dns/domains/${id}`),
  addDNSRecord: (domainId: number, data: any) => request<any>(`/dns/domains/${domainId}/records`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDNSRecord: (recordId: number) => request<any>(`/dns/records/${recordId}`, { method: 'DELETE' }),

  // SSL
  getSSLStatus: (domain: string) => request<any>(`/ssl/${domain}/status`),
  issueSSL: (domain: string, email: string) => request<any>('/ssl/issue', { method: 'POST', body: JSON.stringify({ domain, email }) }),
  renewSSL: () => request<any>('/ssl/renew', { method: 'POST' }),
  uploadCustomSSL: (domain: string, cert: string, key: string) => request<any>('/ssl/custom', { method: 'POST', body: JSON.stringify({ domain, certificate: cert, private_key: key }) }),

  // File Manager
  listFiles: (path: string, baseDir?: string) => request<any>('/files/list', { method: 'POST', body: JSON.stringify({ path, base_dir: baseDir }) }),
  readFile: (path: string, baseDir?: string) => request<any>('/files/read', { method: 'POST', body: JSON.stringify({ path, base_dir: baseDir }) }),
  writeFile: (path: string, content: string, baseDir?: string) => request<any>('/files/write', { method: 'POST', body: JSON.stringify({ path, content, base_dir: baseDir }) }),
  createFile: (path: string, isDir = false, baseDir?: string) => request<any>('/files/create', { method: 'POST', body: JSON.stringify({ path, is_dir: isDir, base_dir: baseDir }) }),
  renameFile: (oldPath: string, newPath: string, baseDir?: string) => request<any>('/files/rename', { method: 'POST', body: JSON.stringify({ old_path: oldPath, new_path: newPath, base_dir: baseDir }) }),
  deleteFile: (path: string, baseDir?: string) => request<any>('/files/delete', { method: 'POST', body: JSON.stringify({ path, base_dir: baseDir }) }),
  chmodFile: (path: string, mode: string, baseDir?: string) => request<any>('/files/chmod', { method: 'POST', body: JSON.stringify({ path, mode, base_dir: baseDir }) }),
  compressFiles: (sources: string[], destZip: string) => request<any>('/files/compress', { method: 'POST', body: JSON.stringify({ sources, destination_zip: destZip }) }),
  extractFiles: (zipPath: string, destDir: string) => request<any>('/files/extract', { method: 'POST', body: JSON.stringify({ zip_path: zipPath, destination_dir: destDir }) }),

  // Database Management
  getDatabases: () => request<any>('/databases'),
  createDatabase: (data: any) => request<any>('/databases', { method: 'POST', body: JSON.stringify(data) }),
  deleteDatabase: (id: number) => request<any>(`/databases/${id}`, { method: 'DELETE' }),
  createDatabaseUser: (data: any) => request<any>('/databases/users', { method: 'POST', body: JSON.stringify(data) }),
  backupDatabase: (id: number) => request<any>(`/databases/${id}/backup`, { method: 'POST' }),

  // PHP Management
  getPhpVersions: () => request<any>('/php/versions'),
  getPhpExtensions: (version: string) => request<any>(`/php/${version}/extensions`),
  getPhpSettings: (version: string) => request<any>(`/php/${version}/settings`),
  updatePhpSettings: (version: string, settings: any) => request<any>(`/php/${version}/settings`, { method: 'POST', body: JSON.stringify({ settings }) }),

  // Docker
  getDockerContainers: () => request<any>('/docker/containers'),
  dockerAction: (id: string, action: string) => request<any>(`/docker/containers/${id}/action`, { method: 'POST', body: JSON.stringify({ action }) }),
  getDockerLogs: (id: string) => request<any>(`/docker/containers/${id}/logs`),
  getDockerImages: () => request<any>('/docker/images'),

  // Email
  getMailboxes: (domain?: string) => request<any>(domain ? `/email/mailboxes?domain=${domain}` : '/email/mailboxes'),
  createMailbox: (data: any) => request<any>('/email/mailboxes', { method: 'POST', body: JSON.stringify(data) }),
  deleteMailbox: (email: string) => request<any>('/email/mailboxes', { method: 'DELETE', body: JSON.stringify({ email }) }),
  getEmailDns: (domain: string) => request<any>(`/email/dns-records?domain=${domain}`),

  // Security & Firewall
  getFirewallStatus: () => request<any>('/security/firewall/status'),
  addFirewallRule: (data: any) => request<any>('/security/firewall/rules', { method: 'POST', body: JSON.stringify(data) }),
  deleteFirewallRule: (ruleNum: number) => request<any>(`/security/firewall/rules/${ruleNum}`, { method: 'DELETE' }),
  toggleFirewall: (enable: boolean) => request<any>('/security/firewall/toggle', { method: 'POST', body: JSON.stringify({ enable }) }),
  getFail2banStatus: () => request<any>('/security/fail2ban'),
  unbanIP: (jail: string, ip: string) => request<any>('/security/fail2ban/unban', { method: 'POST', body: JSON.stringify({ jail, ip }) }),
  getSshConfig: () => request<any>('/security/ssh'),
  runSecurityAudit: () => request<any>('/security/audit'),
  getAuditLogs: () => request<any>('/security/audit-logs'),
  getSecurityAlerts: () => request<any>('/security/alerts'),
  markAlertRead: (id: number) => request<any>(`/security/alerts/${id}/read`, { method: 'POST' }),

  // Backups
  getBackups: () => request<any>('/backups'),
  triggerBackup: (data: any) => request<any>('/backups/trigger', { method: 'POST', body: JSON.stringify(data) }),
  restoreBackup: (id: number, targetDir: string) => request<any>(`/backups/${id}/restore?target_dir=${encodeURIComponent(targetDir)}`, { method: 'POST' }),
  deleteBackup: (id: number) => request<any>(`/backups/${id}`, { method: 'DELETE' }),

  // Cron
  getCronJobs: () => request<any>('/cron'),
  createCronJob: (data: any) => request<any>('/cron', { method: 'POST', body: JSON.stringify(data) }),
  toggleCronJob: (id: number) => request<any>(`/cron/${id}/toggle`, { method: 'POST' }),
  runCronJob: (id: number) => request<any>(`/cron/${id}/run`, { method: 'POST' }),
  deleteCronJob: (id: number) => request<any>(`/cron/${id}`, { method: 'DELETE' }),

  // Terminal
  execTerminal: (command: string, sessionId = 'default') => request<any>('/terminal/exec', { method: 'POST', body: JSON.stringify({ command, session_id: sessionId }) }),

  // Users
  getUsers: () => request<any>('/users'),
  createUser: (data: any) => request<any>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: any) => request<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: number) => request<any>(`/users/${id}`, { method: 'DELETE' }),

  // Logs
  getLogs: (source: string, lines = 100, filter = '') => request<any>(`/logs/tail?source=${source}&lines=${lines}${filter ? `&filter_query=${encodeURIComponent(filter)}` : ''}`),

  // Settings
  getSettings: () => request<any>('/settings'),
  updateSettings: (settings: any) => request<any>('/settings', { method: 'POST', body: JSON.stringify({ settings }) }),
};


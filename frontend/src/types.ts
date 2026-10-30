export interface User {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'administrator' | 'reseller' | 'website_owner';
  is_active: boolean;
  is_totp_enabled: boolean;
  assigned_websites?: string;
  created_at?: string;
}

export interface SystemMetrics {
  hostname: string;
  os_name: string;
  os_version: string;
  kernel_version: string;
  architecture: string;
  public_ip: string;
  uptime_seconds: number;
  load_average: number[];
  cpu: {
    percent: number;
    cores: number;
    physical_cores?: number;
  };
  memory: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    percent: number;
    swap_total_bytes?: number;
    swap_used_bytes?: number;
    swap_percent?: number;
  };
  disk: {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent: number;
  };
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent?: number;
    packets_recv?: number;
  };
  active_processes: number;
  top_processes: Array<{
    pid: number;
    name: string;
    username: string;
    cpu_percent: number;
    memory_percent: number;
    status: string;
  }>;
  timestamp: number;
}

export interface DashboardOverview {
  metrics: SystemMetrics;
  resource_counts: {
    websites: number;
    databases: number;
    backups: number;
    cron_jobs: number;
    unread_alerts: number;
  };
  health_score: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface ManagedService {
  service: string;
  status: 'running' | 'stopped' | 'failed';
  is_active: boolean;
  is_enabled: boolean;
  pid?: number;
  memory_bytes?: number;
  uptime?: string;
  installed?: boolean;
}

export interface Website {
  id: number;
  domain: string;
  aliases?: string;
  document_root: string;
  php_version: string;
  web_server: string;
  is_active: boolean;
  ssl_enabled: boolean;
  ssl_auto_renew: boolean;
  force_https: boolean;
  owner_id: number;
  created_at?: string;
}

export interface DNSRecord {
  id: number;
  domain_id: number;
  record_type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'CAA';
  host: string;
  value: string;
  ttl: number;
  priority?: number;
  created_at?: string;
}

export interface Domain {
  id: number;
  domain_name: string;
  website_id?: number;
  owner_id: number;
  created_at?: string;
  dns_records: DNSRecord[];
}

export interface Database {
  id: number;
  name: string;
  engine: 'mysql' | 'mariadb' | 'postgresql';
  charset: string;
  collation: string;
  size_mb: number;
  website_id?: number;
  created_at?: string;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size_bytes: number;
  permissions: string;
  modified: string;
  extension?: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports?: string;
  created?: string;
}

export interface FirewallRule {
  id: number;
  port: number;
  protocol: string;
  action: string;
  source_ip: string;
  comment?: string;
  created_at?: string;
}

export interface SecurityAlert {
  id: number;
  title: string;
  message: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  created_at?: string;
}

export interface BackupItem {
  id: number;
  name: string;
  backup_type: 'full' | 'website' | 'database';
  target_domain?: string;
  file_path: string;
  file_size_mb: number;
  sha256?: string;
  status: string;
  storage_driver: string;
  created_at?: string;
}

export interface CronJob {
  id: number;
  title: string;
  command: string;
  schedule: string;
  is_active: boolean;
  last_run?: string;
  next_run?: string;
  created_at?: string;
}

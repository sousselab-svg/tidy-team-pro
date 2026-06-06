export type JobStatus = "scheduled" | "on_way" | "in_progress" | "completed" | "cancelled";

export const STATUS_META: Record<JobStatus, { label: string; bg: string; fg: string }> = {
  scheduled: { label: "Agendado", bg: "bg-secondary", fg: "text-muted-foreground" },
  on_way: { label: "A caminho", bg: "bg-[color:var(--warning)]/15", fg: "text-[color:var(--warning)]" },
  in_progress: { label: "Em curso", bg: "bg-[color:var(--info)]/15", fg: "text-[color:var(--info)]" },
  completed: { label: "Concluído", bg: "bg-[color:var(--success)]/15", fg: "text-[color:var(--success)]" },
  cancelled: { label: "Cancelado", bg: "bg-destructive/10", fg: "text-destructive" },
};

export type Job = {
  id: string;
  time: string;
  service: string;
  client: string;
  address: string;
  team: string;
  status: JobStatus;
  price: number;
};

export const todayJobs: Job[] = [
  { id: "4401", time: "08:00", service: "Limpeza Comercial", client: "Escritórios TechHub", address: "Av. Paulista, 1500", team: "Alpha", status: "completed", price: 480 },
  { id: "4402", time: "09:30", service: "Limpeza Padrão", client: "Família Santos", address: "R. Oscar Freire, 220", team: "Bravo", status: "in_progress", price: 280 },
  { id: "4403", time: "11:30", service: "Pós-Obra", client: "Cond. Vila Real, Apto 42", address: "R. Haddock Lobo, 890", team: "Gamma", status: "on_way", price: 750 },
  { id: "4404", time: "14:00", service: "Deep Cleaning", client: "Marina Oliveira", address: "Al. Santos, 45", team: "Bravo", status: "scheduled", price: 420 },
  { id: "4405", time: "16:30", service: "Airbnb Turnover", client: "Rafael Mendes", address: "R. Augusta, 1320", team: "Alpha", status: "scheduled", price: 190 },
];

export type Client = {
  id: string;
  name: string;
  type: "Residencial" | "Comercial";
  phone: string;
  email: string;
  servicesCount: number;
  totalSpent: number;
  rating: number;
  lastService: string;
};

export const clients: Client[] = [
  { id: "c1", name: "Sarah Jenkins", type: "Residencial", phone: "+55 11 98123-4567", email: "sarah@example.com", servicesCount: 24, totalSpent: 6720, rating: 5, lastService: "Há 3 dias" },
  { id: "c2", name: "Escritórios TechHub", type: "Comercial", phone: "+55 11 3456-7890", email: "ops@techhub.co", servicesCount: 52, totalSpent: 24960, rating: 5, lastService: "Hoje" },
  { id: "c3", name: "Família Santos", type: "Residencial", phone: "+55 11 99876-1122", email: "santos@example.com", servicesCount: 18, totalSpent: 5040, rating: 4, lastService: "Hoje" },
  { id: "c4", name: "Marina Oliveira", type: "Residencial", phone: "+55 11 97654-3210", email: "marina@example.com", servicesCount: 6, totalSpent: 2520, rating: 5, lastService: "Há 14 dias" },
  { id: "c5", name: "Cond. Vila Real", type: "Comercial", phone: "+55 11 3210-9988", email: "sindico@vilareal.com", servicesCount: 11, totalSpent: 8250, rating: 4, lastService: "Há 7 dias" },
  { id: "c6", name: "Rafael Mendes", type: "Residencial", phone: "+55 11 98000-2233", email: "rafael@example.com", servicesCount: 32, totalSpent: 6080, rating: 5, lastService: "Há 2 dias" },
];

export type Quote = {
  id: string;
  client: string;
  service: string;
  area: number;
  rooms: number;
  bathrooms: number;
  total: number;
  status: "draft" | "sent" | "approved" | "declined";
  createdAt: string;
};

export const quotes: Quote[] = [
  { id: "Q-1042", client: "Sarah Jenkins", service: "Deep Cleaning", area: 220, rooms: 3, bathrooms: 2, total: 680, status: "approved", createdAt: "Hoje" },
  { id: "Q-1041", client: "Cond. Vila Real", service: "Pós-Obra", area: 480, rooms: 5, bathrooms: 3, total: 1840, status: "sent", createdAt: "Ontem" },
  { id: "Q-1040", client: "Marina Oliveira", service: "Move-Out", area: 95, rooms: 2, bathrooms: 1, total: 520, status: "draft", createdAt: "Há 2 dias" },
  { id: "Q-1039", client: "Bruno Tavares", service: "Standard", area: 140, rooms: 3, bathrooms: 2, total: 320, status: "declined", createdAt: "Há 4 dias" },
];

export const QUOTE_STATUS: Record<Quote["status"], { label: string; bg: string; fg: string }> = {
  draft: { label: "Rascunho", bg: "bg-secondary", fg: "text-muted-foreground" },
  sent: { label: "Enviado", bg: "bg-[color:var(--info)]/15", fg: "text-[color:var(--info)]" },
  approved: { label: "Aprovado", bg: "bg-[color:var(--success)]/15", fg: "text-[color:var(--success)]" },
  declined: { label: "Recusado", bg: "bg-destructive/10", fg: "text-destructive" },
};

export type Invoice = {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "paid" | "open" | "overdue";
};

export const invoices: Invoice[] = [
  { id: "INV-2208", client: "Escritórios TechHub", amount: 2480, dueDate: "10/06", status: "paid" },
  { id: "INV-2207", client: "Sarah Jenkins", amount: 680, dueDate: "08/06", status: "paid" },
  { id: "INV-2206", client: "Cond. Vila Real", amount: 1840, dueDate: "12/06", status: "open" },
  { id: "INV-2205", client: "Bruno Tavares", amount: 320, dueDate: "01/06", status: "overdue" },
  { id: "INV-2204", client: "Marina Oliveira", amount: 420, dueDate: "15/06", status: "open" },
];

export const INVOICE_STATUS: Record<Invoice["status"], { label: string; bg: string; fg: string }> = {
  paid: { label: "Pago", bg: "bg-[color:var(--success)]/15", fg: "text-[color:var(--success)]" },
  open: { label: "Em aberto", bg: "bg-[color:var(--info)]/15", fg: "text-[color:var(--info)]" },
  overdue: { label: "Atrasado", bg: "bg-destructive/10", fg: "text-destructive" },
};

export function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
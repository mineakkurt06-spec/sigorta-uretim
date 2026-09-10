export type Policy = {
  id: string;
  created_at: string;
  sigorta_sirketi: string;
  musteri_adi: string;
  police_no: string;
  plaka: string;
  net_prim: number;
  brut_prim: number;
  bitis_tarihi: string;
  baslangic_tarihi: string;
  tanzim_tarihi: string;
  sigorta_turu: string;
  agency_id: string | null;
  uretim_tipi: string;
  odeme_durumu: string;
  payment_method: string;
  aciklama: string | null;
  iptal: boolean;
  file_url: string | null;
  file_name: string | null;
  record_type?: string;
  bank_account_id?: string | null;
  branch_group?: string;
  issuing_agency_id?: string | null;
};

export type Customer = {
  id: string;
  tc_vergi_no: string;
  ad_soyad_unvan: string;
  referans: string;
  telefon: string;
  eposta: string;
  dogum_tarihi: string;
  ruhsat_belge_no: string;
  plaka_no: string;
  motor_no: string;
  sase_no: string;
  arac_yili: string;
  arac_markasi: string;
  arac_modeli: string;
  arac_kodu: string;
  arac_tipi: string;
  uavt_adres_kodu: string;
  notes: string | null;
};

export type Agency = { id: string; name: string; commission_rate?: number; is_external?: boolean; created_at?: string };

export type Payment = {
  id: string;
  policy_id: string;
  amount: number;
  note: string;
  paid_at: string;
};

export type InsuranceCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
};

export type InsuranceBranch = {
  id: string;
  name: string;
  branch_group: 'OTO' | 'KONUT' | 'HAYAT' | 'DIGER';
  created_at: string;
};

export type BankAccount = {
  id: string;
  bank_name: string;
  account_name: string;
  iban: string;
  card_limit: number;
  created_at: string;
};

export type SubAgent = {
  id: string;
  name: string;
  commission_rate: number;
  created_at: string;
};

export type Quote = {
  id: string;
  customer_name: string;
  phone: string | null;
  branch_group: string | null;
  insurance_type: string | null;
  status: string;
  created_at: string;
  agency_id: string | null;
  bitis_tarihi: string | null;
  notes: string | null;
};

export type AgencyProfile = {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteItem = {
  id: string;
  quote_id: string;
  company_name: string;
  premium_amount: number;
  agency_id: string | null;
  created_at: string;
};

export type LostCustomer = {
  id: string;
  customer_name: string;
  phone: string;
  insurance_type: string;
  reason: string;
  lost_company: string;
  premium_amount: number;
  created_at: string;
};

export type DamageRecord = {
  id: string;
  musteri_adi: string;
  police_no: string;
  arac_plaka: string;
  hasar_tarihi: string;
  hasar_tutar: number;
  aciklama: string;
  durum: string;
  created_at: string;
};

export type Reminder = {
  id: string;
  baslik: string;
  aciklama: string;
  tarih: string;
  durum: string;
  created_at: string;
};

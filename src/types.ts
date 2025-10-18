// ===== Types =====

export type ImageAttachment = {
  filename: string;
  mime: string;
  dataUrl: string;
  addedAt: string;
};

// שים לב: value/amount יכולים להיות "" כדי שהאינפוט יוצג ריק
export type CalcItem = {
  id: string;
  value: number | "";
};

export type Deduction = {
  id: string;
  amount: number | "";
  note: string;
  attachment?: ImageAttachment;
};

export type CalcSession = {
  id: string;
  title: string;
  createdAt: string;
  percent: number;
  items: CalcItem[];
  deductions: Deduction[];
};

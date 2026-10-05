// ============================================================
// TicketStatus: Ek ticket (queue entry) ki possible states.
// Ye ek union type hai - matlab status sirf inhi 6 values mein se koi ek ho sakta hai.
// PLACED     = Customer ne abhi queue mein daala hai
// ACCEPTED   = Shop ne ticket accept kar liya
// IN_PROGRESS = Staff ne kaam shuru ho gaya
// READY      = Order/service ready hai, customer collect kar sakta hai
// COMPLETED  = Sab kuch ho gaya, transaction khatam
// CANCELLED  = Ticket cancel ho gaya (customer ya staff ne)
export type TicketStatus =
  | "PLACED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

// FieldTypeName: Custom form fields ke possible data types.
// Jab koi shop apna booking form customize karta hai, tab har field ka ek type hoga:
// TEXT      = Plain text input
// NUMBER    = Sirf numbers
// SELECT    = Dropdown (ek option choose karo)
// PHONE     = Phone number input (special formatting/validation ke saath)
// MULTILINE = Textarea - zyada text ke liye (jaise notes, address)
export type FieldTypeName = "TEXT" | "NUMBER" | "SELECT" | "PHONE" | "MULTILINE";

// FieldDto: Ek custom form field ka description - backend se aata hai (read-only view).
// Ye batata hai ki koi particular field kaisa dikhega aur kaise behave karega.
export interface FieldDto {
  key: string; // Unique identifier jab form submit hota hai (e.g., "vehicleNumber")
  label: string; // User ko jo dikhta hai form mein (e.g., "Vehicle Number")
  type: FieldTypeName; // Input ka type (TEXT, SELECT, etc.)
  required: boolean; // Agar true hai toh ye field fill karna zaroori hai
  order: number; // Form mein fields ka display order (chhota number = pehle dikhega)
}

// FormFieldDto: Admin ke liye ek form field ka full description - id aur active flag ke saath.
// FieldDto se thoda alag - yahan `id` aur `active` bhi hain kyunki admin CRUD kar sakta hai.
export interface FormFieldDto {
  id: number; // Database mein is field ka unique ID
  key: string; // Programmatic identifier
  label: string; // Display naam
  type: FieldTypeName; // Input type
  required: boolean; // Mandatory hai ya optional
  displayOrder: number; // Form mein position
  active: boolean; // Agar false hai toh ye field customers ko nahi dikhta
}

// FieldCommand: Naya custom field create ya update karne ke liye backend ko bheja jaata hai.
// Sirf wo fields hain jo admin control karta hai - `key` aur `order` system generate karta hai.
export interface FieldCommand {
  label: string; // Field ka naam jo user ko dikhega
  type: FieldTypeName; // Kis tarah ka input chahiye
  required: boolean; // Mandatory hai ya nahi
}

// FieldValueDto: Ek filled form field ki value - ticket ke saath store hoti hai.
// Jab customer form fill karta hai, har field ka ek FieldValueDto banta hai.
export interface FieldValueDto {
  label: string; // Field ka naam (display ke liye)
  value: string; // Customer ne jo value dali (hamesha string mein store hota hai)
}

// CatalogItemDto: Shop ke menu/catalog mein ek item (service ya product).
// Customer booking ke waqt in items mein se select kar sakta hai.
export interface CatalogItemDto {
  id: number;
  name: string; // Item ka naam (e.g., "Haircut", "Oil Change")
  avgMinutes: number; // Average kitne time lagta hai - ETA calculate karne ke liye
  price: number; // Item ka price
  description: string | null; // Optional description - null agar koi description nahi
  category: string | null; // Optional category grouping (e.g., "Beverages", "Services")
  serviceSectionId: number | null; // Agar multi-section hai toh kaunsa section ye item belong karta hai
}

// FormConfigDto: Ek shop ka poora booking form configuration - public API se milta hai.
// Jab customer kisi shop ka booking page open karta hai, yahi object load hota hai.
// Isme shop info + form fields + catalog items + timing sab kuch hota hai.
export interface FormConfigDto {
  businessCode: string; // Shop ka unique code (URL mein use hota hai)
  businessName: string; // Brand/business ka naam
  industryType: string; // Shop ka type (e.g., "SALON", "RESTAURANT")
  shopName: string | null; // Specific shop location ka naam (agar multi-location hai)
  shopCity: string | null; // Shop kis city mein hai
  shopPhone: string | null; // Contact number
  shopAddress: string | null; // Physical address
  fields: FieldDto[]; // Custom form fields jo customer ko fill karne hain
  items: CatalogItemDto[]; // Available services/products jo select kar sakte hain
  sections: ServiceSectionDto[]; // Available service sections
  statusFlow: string[]; // Is shop ke liye valid ticket statuses ka order
  shopOpenTime: string; // Opening time (e.g., "09:00")
  shopCloseTime: string; // Closing time (e.g., "21:00")
  shopOperatingDays: string; // "1,2,3,4,5,6,7" - comma-separated day numbers (1=Mon, 7=Sun)
  hasPaymentQr: boolean; // Agar shop ne payment QR code set kiya hai toh true and order place hone ke baad dikhao
}

// TicketItemDto: Ek ticket mein ek selected item ki details.
// Ek ticket mein multiple items ho sakte hain - ek hi order mein multiple services.
export interface TicketItemDto {
  itemName: string; // Item ka naam (snapshot at booking time)
  quantity: number; // Kitne items liye
  unitPrice: number; // Ek item ka price
  lineTotal: number; // quantity * unitPrice - pre-calculated for display
}

// Admin menu (active + inactive)

// MenuItemDto: Admin panel mein menu item ka full representation.
// CatalogItemDto se alag - yahan `active` flag hai (admin inactive items bhi dekh sakta hai).
export interface MenuItemDto {
  id: number;
  name: string;
  avgMinutes: number;
  price: number;
  active: boolean; // false = customers ko nahi dikhta, par history mein rahta hai
  description: string | null;
  category: string | null;
  serviceSectionId?: number | null; // Agar multi-section hai toh kaunsa section ye item belong karta hai
}

// MenuItemCommand: Naya menu item create ya existing update karne ka request body.
// `?` ka matlab optional field - dena zaroori nahi, undefined bhi chalega.
export interface MenuItemCommand {
  name: string;
  avgMinutes: number;
  price: number;
  description?: string | null; // Optional - nahi diya toh backend default use karega
  category?: string | null; // Optional - nahi diya toh uncategorized rahega
  serviceSectionId?: number | null; // Agar multi-section hai toh kaunsa section ye item belong karta hai
}

// ServiceSectionDto: Menu items ko organize karne ke liye subsections (e.g., "Pizza", "Burgers").
// Restaurant mein alag-alag service sections hote hain — har section mein multiple items.
export interface ServiceSectionDto {
  id: number;
  businessId: number;    // Parent business (section)
  name: string;           // Section name (e.g., "Pizza", "Burgers")
  displayOrder: number;   // Display order for sorting
  active: boolean;        // Agar false hai toh section hidden
}

// ServiceSectionCommand: Naya service section create ya update karne ka request body.
export interface ServiceSectionCommand {
  name: string;
}

// StaffStatsDto: Ek staff member ki performance stats.
// Admin reports page pe dikhti hai - kaun kitna kaam kar raha hai.
export interface StaffStatsDto {
  username: string; // Staff ka login naam
  completed: number; // Kitne tickets complete kiye
  cancelled: number; // Kitne tickets cancel kiye
  avgMinutes: number; // Average service time in minutes
}

// AuditLogEntryDto: Ek admin action ka log entry.
// System mein koi bhi important change hone par audit log mein entry jaati hai.
export interface AuditLogEntryDto {
  action: string; // Kya kiya gaya (e.g., "TICKET_CANCELLED", "MENU_ITEM_ADDED")
  target: string; // Kis cheez pe action hua (e.g., ticket ID, item name)
  by: string; // Kisne kiya (username)
  at: string; // Kab kiya - ISO timestamp string (e.g., "2024-01-15T14:30:00Z")
}

// TicketDto: Ek complete ticket ka poora data - queue entry ka full representation.
// Ye sabse important type hai. Har booking/queue entry yahi shape follow karti hai.
// Customer tracking page, staff dashboard, admin panel - sab jagah yahi use hota hai.
export interface TicketDto {
  id: number;
  businessCode: string; // Kaunsi shop ka ticket hai
  customerName: string; // Customer ka naam
  customerPhone: string | null; // Contact number - optional
  status: TicketStatus; // Current status (PLACED, IN_PROGRESS, etc.)
  queuePosition: number; // Queue mein kaun si position pe hai (1 = next)
  etaMinutes: number; // Estimated wait time in minutes
  placedTime: string | null; // Ticket banane ka time (HH:mm format)
  placedDate: string | null; // Ticket banane ki date (YYYY-MM-DD format)
  pickTime: string | null; // Jab staff ne ticket accept kiya
  readyTime: string | null; // Jab service READY mark hui
  startTime: string | null; // Jab kaam shuru hua (IN_PROGRESS)
  completedTime: string | null; // Jab ticket complete hua
  readyEstimateTime: string | null; // Predicted time jab order ready hoga
  scheduledTime: string | null; // Agar advance booking hai toh scheduled time
  scheduled: boolean; // true = advance booking, false = walk-in/immediate
  cancelReason: string | null; // Cancel kyu hua - null agar cancelled nahi
  totalAmount?: number; // Total bill amount
  comment: string | null; // Customer ya staff ka additional note
  paymentReceived: number | null; // Kitna payment mila - null agar tracked nahi
  paymentNote: string | null; // Payment ka note (e.g., "UPI", "Cash")
  paymentPendingReason: string | null; // Agar payment pending hai toh kyun
  extraFields: FieldValueDto[]; // Customer ne jo custom fields fill kiye (key-value pairs)
  items: TicketItemDto[]; // Is ticket mein kaun se items/services hain
}

// DashboardStatsDto: Staff/admin dashboard ka quick summary.
// Page load hone par ye numbers dikhte hain - real-time queue health.
export interface DashboardStatsDto {
  waiting: number; // Abhi queue mein kitne log hain (PLACED status)
  inProgress: number; // Abhi service chal rahi hai kitne customers ke liye
  ready: number; // Kitne orders ready hain lekin pickup nahi hua
  totalToday: number; // Aaj ke total tickets (saare statuses mila ke)
}

// ItemSelection: Customer jab booking karta hai tab jo items select karta hai.
// Ye frontend se backend ko bheja jaata hai CreateTicketCommand ke andar.
export interface ItemSelection {
  catalogItemId: number; // CatalogItemDto ka id - kaunsa item select kiya
  quantity: number; // Kitna quantity chahiye
}

// CreateTicketCommand: Naya ticket create karne ka request body - backend ko bheja jaata hai.
// Jab customer booking form submit karta hai tab yahi object API mein jaata hai.
export interface CreateTicketCommand {
  customerName: string;
  customerPhone: string;
  fieldValues: Record<string, unknown>; // Custom fields ka map: { "vehicleNo": "MH01AB1234" }
  items: ItemSelection[]; // Selected services/products
  scheduledFor?: string | null; // ISO instant, null/undefined = abhi (walk-in)
  comment?: string | null; // Optional note
  shopCode?: string | null; // Agar multi-shop business hai toh kaunsa shop
}

// ---- Shop / sections ----

// SectionDto: Ek shop ke andar ek "section" ya "service type" ka description.
// Example: Ek salon mein "Hair" aur "Nails" alag sections ho sakte hain.
// Ek business code under multiple sections ho sakte hain.
export interface SectionDto {
  code: string; // Section ka unique identifier
  displayName: string; // User-friendly naam (e.g., "Men's Haircut")
  industryType: string; // Section type (e.g., "SALON", "BARBER")
  active: boolean; // false = temporarily closed/hidden
  globallyBanned: boolean; // Platform admin ne ban kiya hai toh true
  deletionScheduledAt: string | null; // Kab delete hoga - null agar deletion scheduled nahi
}

// ShopDto: Ek shop ki basic public information + real-time open/closed status.
// Discovery page ya booking page ke liye use hota hai.
export interface ShopDto {
  code: string;
  name: string;
  country: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  address: string | null;
  open: boolean; // RIGHT NOW kya shop open hai (schedule ke hisaab se)
  withinHours: boolean; // Abhi operating hours ke andar hai ya nahi
  openTime: string; // Daily opening time
  closeTime: string; // Daily closing time
  operatingDays: string; // Comma-separated days (e.g., "1,2,3,4,5" = Mon-Fri)
  sections: SectionDto[]; // Is shop ke saare sections
}

// ---- Auth ----

// LoginCommand: Login karne ke liye backend ko bheja jaane wala request body.
// Username + password - simple authentication.
export interface LoginCommand {
  username: string;
  password: string;
}

// OwnerSignupCommand: Naya shop register karne ka full request body.
// Ye form owner tab fill karta hai jab pehli baar platform pe sign up karta hai.
export interface OwnerSignupCommand {
  shopName: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  phone: string;
  address: string;
  username: string; // Login ke liye username
  password: string; // Login ke liye password
  recoveryCode: string; // Password bhool jaane ke liye recovery code (user khud set karta hai)
  sectionTypes: string[]; // Kaun se service types enable karne hain (e.g., ["SALON", "SPA"])
}

// Role: System mein do tarah ke users hain.
// ADMIN = Shop owner - poora access, settings change kar sakta hai
// STAFF = Employee - sirf tickets manage kar sakta hai, settings nahi
export type Role = "ADMIN" | "STAFF";

// AuthDto: Successful login ke baad backend se milta hai.
// Isme JWT token aur user info hoti hai - localStorage mein save kiya jaata hai.
// Token ko har API request ke Authorization header mein bheja jaata hai.
export interface AuthDto {
  token: string; // JWT token - "Bearer <token>" format mein API calls mein use hota hai
  username: string; // Logged in user ka naam
  role: Role; // ADMIN ya STAFF - UI access control ke liye
  shopCode: string; // Is user ka shop ka code
  shopName: string; // Display ke liye shop naam
  sections: SectionDto[]; // Is user ke accessible sections
}

// ShopDetailDto: Admin settings page ke liye shop ki full details.
// ShopDto se zyada detailed - recoveryCode aur plan info bhi hain.
export interface ShopDetailDto {
  code: string;
  name: string;
  country: string | null;
  state: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  address: string | null;
  recoveryCode: string | null; // Password recovery ke liye secret code
  open: boolean; // Abhi open hai ya nahi
  plan: string; // Subscription plan (e.g., "FREE", "PAID")
  openTime: string | null; // Schedule opening time
  closeTime: string | null; // Schedule closing time
  operatingDays: string | null; // Active days
  forceServiceSelect: boolean; // true = customer ko koi ek service zaroor select karni hogi
  tierSystemEnabled: boolean; // true = priority/tier queue system active hai
  hasPaymentQr: boolean; // true = shop ne payment QR code set kiya hai
}

// SuperAdminShopDto: Platform-level super admin ke liye shop ka summary.
// Regular admin ko yahan recovery code dikhta hai - super admin monitoring ke liye.
export interface SuperAdminShopDto {
  code: string;
  name: string;
  country: string | null;
  state: string | null;
  city: string | null;
  phone: string | null;
  recoveryCode: string | null; // Super admin ko recovery code dikhta hai (support ke liye)
  adminUsername: string; // Is shop ka admin kaun hai
  plan: string; // Current subscription plan
  sections: SectionDto[]; // Shop ke saare sections
}

// UpdateShopCommand: Admin jab shop settings update karta hai tab bheja jaane wala body.
// Sab fields required hain - partial update support nahi hai (PUT request).
export interface UpdateShopCommand {
  name: string;
  country: string;
  state: string;
  city: string;
  pincode: string;
  phone: string;
  address: string;
  openTime: string; // Format: "HH:mm" (e.g., "09:00")
  closeTime: string; // Format: "HH:mm" (e.g., "21:00")
  operatingDays: string; // Comma-separated day numbers (e.g., "1,2,3,4,5")
}

// ---- Discovery ----

// ShopSummaryDto: Public shop directory/search results ke liye lightweight shop info.
// Full ShopDto se chhota - sirf itna jo list/card view ke liye kaafi hai.
export interface ShopSummaryDto {
  code: string;
  name: string;
  state: string | null;
  city: string | null;
  pincode: string | null;
  open: boolean; // Abhi open hai ya nahi
  sectionTypes: string[]; // Kaun kaun se services available hain
}

// PlatformConfigDto: Platform-level configuration - super admin control karta hai.
// Frontend is config ke basis par features enable/disable karta hai.
export interface PlatformConfigDto {
  customFieldsEnabled: boolean; // Custom form fields feature on/off
  tierSystemEnabled: boolean; // Priority queue system on/off
  showPlanInfoIcon: boolean; // UI mein plan info icon dikhao ya nahi
  showPlanBadge: boolean; // Plan badge (FREE/PAID) dikhao ya nahi
  paidPrice: string; // Paid plan ka price (string mein - currency formatting ke liye)
  paidCurrency: string; // Currency code (e.g., "INR", "USD")
  bannedServiceTypes: string[]; // In service types ko naye shops nahi add kar sakte
  paymentQrEnabled: boolean; // Super Admin ka global switch - agar false hai toh sab shops ke liye payment QR feature disable ho jaayega
}

// CityDto: Ek city ka representation - dropdown populate karne ke liye.
// Location-based shop search mein use hota hai.
export interface CityDto {
  state: string | null; // State ka naam - null agar state info nahi hai
  city: string; // City ka naam
}

// ---- History (customer / staff / admin) ----

// HistoryDto: Past tickets ka aggregated view.
// Customer, staff, ya admin - teeno ke liye same structure use hota hai history page pe.
export interface HistoryDto {
  today: number; // Aaj ke tickets ki total count
  month: number; // Is mahine ke tickets ki total count
  orders: TicketDto[]; // Actual ticket list - paginated ya filtered ho sakti hai
}

// ---- Admin overview ----

// SectionStatsDto: Ek section ki real-time stats - admin overview page ke liye.
// Dashboard pe har section ka ek card hota hai data ke saath.
export interface SectionStatsDto {
  sectionCode: string; // Section identifier
  displayName: string; // Section ka naam
  industryType: string; // Section type
  active: boolean; // Section active hai ya paused
  hasOrders: boolean; // Aaj koi orders hain ya nahi (empty state ke liye)
  waiting: number; // Abhi queue mein kitne log
  inProgress: number; // Abhi kitne in-progress hain
  ready: number; // Kitne orders ready hain
  totalToday: number; // Aaj ke total tickets
  sales: SalesStatsDto; // Revenue stats - embedded object
  globallyBanned: boolean; // Platform ne ban kiya hai
  deletionScheduledAt: string | null; // Scheduled deletion time - null agar koi plan nahi
}

// GlobalBanStatusDto: Platform admin ka ban/restriction status.
// Super admin panel mein use hota hai - kaun kaun se types banned hain.
export interface GlobalBanStatusDto {
  bannedTypes: string[]; // Banned service type names ki list
  deletionAfterDays: string; // Banned sections kitne dino mein delete honge (string format)
}

// SalesStatsDto: Revenue aur order count ka summary - multiple time periods ke liye.
// Admin ko business performance at a glance dikhata hai.
export interface SalesStatsDto {
  dayCount: number; // Aaj completed orders ki count
  monthCount: number; // Is mahine completed orders ki count
  dayAmount: number; // Aaj ka total revenue (completed orders)
  monthAmount: number; // Is mahine ka total revenue
  dayCancelCount: number; // Aaj kitne orders cancel hue
  monthCancelCount: number; // Is mahine kitne cancel hue
}

// AdminOverviewDto: Admin ka poora overview - shop summary + all sections + total sales.
// Ye ek hi API call mein poora dashboard data deta hai (efficient loading ke liye).
export interface AdminOverviewDto {
  shopName: string; // Shop ka naam - page header mein dikhta hai
  sections: SectionStatsDto[]; // Har section ki individual stats
  sales: SalesStatsDto; // Poori shop ki combined sales stats
}

// StaffUserDto: Admin panel mein ek staff member ka representation.
// Staff management page pe list dikhane ke liye use hota hai.
export interface StaffUserDto {
  username: string;
  sectionCodes: string[]; // Ye staff kaunse sections manage kar sakta hai
}

// LocalOrder: Browser localStorage mein saved order ka minimal record.
// Customer jab ticket banata hai, ye info localStorage mein save hoti hai
// taaki wapas aane par (bina phone/login ke) apne recent orders dekh sake.
export interface LocalOrder {
  ticketId: number;
  sectionName: string;
  placedTime: string | null;
}
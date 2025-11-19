export type Language = 'lv' | 'en' | 'ru' | 'lt';

export const translations = {
  lv: {
    // Common
    login: "Pieslēgties",
    register: "Reģistrēties",
    email: "E-pasts",
    password: "Parole",
    name: "Vārds",
    phone: "Telefons",
    save: "Saglabāt",
    cancel: "Atcelt",
    delete: "Dzēst",
    edit: "Rediģēt",
    search: "Meklēt",
    filter: "Filtrēt",
    loading: "Ielādē...",
    error: "Kļūda",
    success: "Veiksmīgi",
    
    // Navigation
    home: "Sākums",
    profile: "Profils",
    bookings: "Rezervācijas",
    professionals: "Meistari",
    dashboard: "Panelis",
    logout: "Iziet",
    
    // User roles
    client: "Klients",
    professional: "Meistars",
    admin: "Administrators",
    
    // Auth
    alreadyHaveAccount: "Jau ir konts?",
    dontHaveAccount: "Nav konta?",
    forgotPassword: "Aizmirsi paroli?",
    createAccount: "Izveidot kontu",
    signInToContinue: "Piesakieties, lai turpinātu",
    signUpAsClient: "Reģistrēties kā klients",
    signUpAsProfessional: "Reģistrēties kā meistars",
    
    // Professional
    category: "Kategorija",
    bio: "Apraksts",
    city: "Pilsēta",
    services: "Pakalpojumi",
    gallery: "Galerija",
    rating: "Vērtējums",
    reviews: "Atsauksmes",
    bookNow: "Pieteikties vizītei",
    price: "Cena",
    duration: "Ilgums",
    verified: "Verificēts",
    
    // Categories
    manicure: "Manikīrs",
    pedicure: "Pedikīrs",
    lashes: "Skropstas",
    hair: "Frizieris",
    massage: "Masāža",
    cosmetology: "Kosmetoloģija",
    
    // Bookings
    upcomingBookings: "Nākamās rezervācijas",
    pastBookings: "Vēsturiskie",
    newBooking: "Jauna rezervācija",
    bookingDetails: "Rezervācijas detaļas",
    date: "Datums",
    time: "Laiks",
    status: "Statuss",
    pending: "Gaida apstiprinājumu",
    confirmed: "Apstiprināts",
    completed: "Pabeigts",
    canceled: "Atcelts",
    confirmBooking: "Apstiprināt",
    cancelBooking: "Atcelt",
    completeBooking: "Atzīmēt kā pabeigtu",
    
    // Reviews
    leaveReview: "Atstāt atsauksmi",
    writeReview: "Uzrakstīt atsauksmi",
    submitReview: "Iesūtīt atsauksmi",
    yourRating: "Jūsu vērtējums",
    yourComment: "Jūsu komentārs",
    
    // Search & Filter
    searchProfessionals: "Meklēt meistaru",
    filterByCategory: "Filtrēt pēc kategorijas",
    filterByCity: "Filtrēt pēc pilsētas",
    filterByPrice: "Filtrēt pēc cenas",
    allCategories: "Visas kategorijas",
    allCities: "Visas pilsētas",
    
    // Admin
    manageProfessionals: "Pārvaldīt meistarus",
    manageUsers: "Pārvaldīt lietotājus",
    manageBookings: "Pārvaldīt rezervācijas",
    manageReviews: "Pārvaldīt atsauksmes",
    verifyProfessional: "Verificēt meistaru",
    totalUsers: "Kopā lietotāji",
    totalProfessionals: "Kopā meistari",
    totalBookings: "Kopā rezervācijas",
    
    // Professional Dashboard
    myServices: "Mani pakalpojumi",
    addService: "Pievienot pakalpojumu",
    editService: "Rediģēt pakalpojumu",
    serviceName: "Pakalpojuma nosaukums",
    serviceDescription: "Apraksts",
    servicePrice: "Cena (EUR)",
    serviceDuration: "Ilgums (minūtes)",
    earnings: "Ieņēmumi",
    thisMonth: "Šomēnes",
    totalEarnings: "Kopējie ieņēmumi",
    completedServices: "Pabeigti pakalpojumi",
    
    // Messages
    bookingCreated: "Rezervācija veiksmīgi izveidota!",
    bookingCanceled: "Rezervācija atcelta",
    bookingConfirmed: "Rezervācija apstiprināta",
    bookingCompleted: "Rezervācija pabeigta",
    reviewSubmitted: "Atsauksme iesūtīta!",
    profileUpdated: "Profils atjaunināts",
    serviceAdded: "Pakalpojums pievienots",
    serviceUpdated: "Pakalpojums atjaunināts",
    serviceDeleted: "Pakalpojums dzēsts",
    loginSuccess: "Veiksmīgi pieslēdzies!",
    loginError: "Nepareizs e-pasts vai parole",
    registerSuccess: "Reģistrācija veiksmīga!",
    registerError: "Reģistrācijas kļūda",
  }
};

export function useTranslation(lang: Language = 'lv') {
  return translations[lang];
}
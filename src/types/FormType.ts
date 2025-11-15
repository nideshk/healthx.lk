export interface AppointmentFormInputs {
  selectedServiceId: string;
  selectedServiceTitle: string;
  attendeeCount: number;
  selectedDoctor: Doctor | null;
  starts_at: string|null;
  ends_at: string | null;
  selectedAttendees: string[]; // ✅ array of related patient IDs
  appointmentType: AppointmentType | null;
  consent : any;
  pre_consultation: any;
  payment_status: any;
  selectedService : any;
  last_visited_step: number;
}



export interface AppointmentTime {
    starts_at : string;
    ends_at : string;
}

export interface AppointmentType{
    id: string;
    name : string;
    duration : number;
    max_attendees : number;
}

export interface Doctor {
  id: string;
  price : number;
  name: string;
  full_name : string;
  registration: string;
  fee: number;
  currency: string;
  rating: { advice: number; punctuality: number; overall: number };
}

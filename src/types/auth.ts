export type UserRole = 'USER' | 'PRACTITIONER' | 'ADMIN';

export type AppUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
};

export type Practitioner = {
    user_id: string;
    specialization: string;
    clinic_name: string;
};

export type Admin = {
    user_id: string;
    permissions: string[];
};

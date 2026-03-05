import { NextResponse } from 'next/server';

const EXTERNAL_API_URL = 'https://open.er-api.com/v6/latest/LKR';

export async function GET() {
    try {
        const response = await fetch(EXTERNAL_API_URL, {
            next: { revalidate: 86400 }, // Cache for 24 hours on the server
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch from external API: ${response.status}`);
        }

        const data = await response.json();

        return NextResponse.json({
            rates: data.rates,
            last_updated: data.time_last_update_utc,
        });

    } catch (error: any) {
        console.error('Currency API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch currency rates' },
            { status: 500 }
        );
    }
}

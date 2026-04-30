import axios from 'axios';

interface EmailResponse {
    status?: string;
    message?: string;
}

export async function sendMail(data: Record<string, unknown>): Promise<void> {
    const url = 'https://relay.artisanhosting.net:8000/api/sendmail';
    const headers = {
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.post(url, data, { headers });
        let responseData: EmailResponse | string = response.data;

        if (typeof responseData === 'string') {
            responseData = JSON.parse(responseData) as EmailResponse;
        }

        if (responseData.status === 'success') {
            console.log('Success: ' + responseData.message);
        } else {
            console.log('Failed: ' + (responseData.message || 'An error occurred.'));
        }
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('An error occurred: ', message);
        console.log('There was a problem sending your message. Please try again later.');
    }
}

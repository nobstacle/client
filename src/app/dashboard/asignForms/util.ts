import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/assigned-form';

export const saveFormData = async (formDataObject: { form_id: string; form_name: string; assigned_companies: string[] }) => {
    try {
        const response = await axios.post(API_URL, formDataObject, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error saving form data:', error);
        throw error;
    }
};
import axios from 'axios';
let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

const API_URL = process.env.NEXT_PUBLIC_API_URL || Url + '/api/assigned-form';

export const saveFormData = async (formDataObject: { form_id: string; form_name: string; assigned_companies: string[], previous_year_url: string,  this_month_url: string, this_year_url: string, previous_month_url: string }) => {
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
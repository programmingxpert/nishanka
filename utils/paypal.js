const mode = process.env.PAYPAL_MODE || 'sandbox';
const getBaseUrl = () => mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken() {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    if (!clientId || !clientSecret || clientId === 'your_paypal_client_id_here' || clientSecret === 'your_paypal_client_secret_here') {
        throw new Error('PayPal Client ID or Client Secret is not configured in .env (still set to placeholder values)');
    }

    const baseUrl = getBaseUrl();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: 'POST',
        body: 'grant_type=client_credentials',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to fetch PayPal Access Token: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.access_token;
}

async function createPayPalOrder(amount, currency = 'USD') {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getBaseUrl();

    // Ensure amount is formatted to 2 decimal places as required by PayPal
    const formattedAmount = parseFloat(amount).toFixed(2);

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    amount: {
                        currency_code: currency,
                        value: formattedAmount
                    }
                }
            ]
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to create PayPal Order: ${response.statusText} - ${errText}`);
    }

    return await response.json();
}

async function capturePayPalOrder(orderId) {
    const accessToken = await getPayPalAccessToken();
    const baseUrl = getBaseUrl();

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to capture PayPal Order: ${response.statusText} - ${errText}`);
    }

    return await response.json();
}

module.exports = {
    createPayPalOrder,
    capturePayPalOrder
};

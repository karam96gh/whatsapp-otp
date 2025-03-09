const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const app = express();
const port = 3000; // يمكن تغيير المنفذ حسب الحاجة

// إعداد العميل الخاص بـ WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(), // للحفاظ على الجلسة بين إعادة تشغيل السيرفر
});

// عند الحصول على QR، نعرضه في الكونسول لربط الحساب
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Please scan the QR code');
});

// عندما يتم الاتصال بنجاح
client.on('ready', () => {
    console.log('WhatsApp Client is ready!');
});

// إرسال OTP
function sendOTP(phoneNumber, otp) {
    const number = phoneNumber + '@c.us';  // صيغة الرقم في WhatsApp
    const message = `Your OTP is: ${otp}`;
    
    client.sendMessage(number, message)
        .then(response => {
            console.log('OTP sent successfully:', response);
        })
        .catch(error => {
            console.error('Error sending OTP:', error);
        });
}

// إعداد API بسيط باستخدام Express
app.use(express.json()); // للتمكن من استقبال البيانات بصيغة JSON

// نقطة النهاية (Endpoint) لإرسال OTP
app.post('/send-otp', (req, res) => {
    const { phoneNumber, otp } = req.body; // نقوم باستقبال الرقم والـ OTP من جسم الطلب
    if (!phoneNumber || !otp) {
        return res.status(400).send('Phone number and OTP are required');
    }

    // إرسال OTP إلى الرقم
    sendOTP(phoneNumber, otp);

    // الرد على العميل
    res.status(200).send('OTP sent successfully');
});

// بدء الخادم
client.initialize();
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

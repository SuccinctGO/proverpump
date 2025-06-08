const { createClient } = require('@supabase/supabase-js');
     require('dotenv').config();

     const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

     async function uploadFile(file) {
       try {
         const fileName = `${Date.now()}-${file.originalname}`;
         const { data, error } = await supabase.storage
           .from('token-images')
           .upload(fileName, file.buffer, {
             contentType: file.mimetype,
           });
         if (error) throw error;
         const { signedURL } = await supabase.storage
           .from('token-images')
           .createSignedUrl(fileName, 60 * 60 * 24 * 365); // URL на 1 рік
         return signedURL;
       } catch (err) {
         console.error('Storage upload error:', err);
         throw new Error('Failed to upload image');
       }
     }

     module.exports = { uploadFile };
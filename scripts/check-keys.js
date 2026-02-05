const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Simple JWT decoder (no verification, just reading payload)
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

async function testConnection() {
    console.log('\n🔍 DIAGNÓSTICO DE CLAVES SUPABASE 🔍\n');

    // Load .env.local
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ No se encuentra .env.local');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) env[key.trim()] = valueParts.join('=').trim();
    });

    const url = env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

    if (!url || !serviceKey) {
        console.error('❌ Faltan variables en .env.local');
        return;
    }

    // Extract Project ID from URL
    // Format: https://[PROJECT_ID].supabase.co
    const urlProjectId = url.replace('https://', '').split('.')[0];

    console.log(`1️⃣ PROYECTO SEGÚN URL (.stb.co):`);
    console.log(`   ID: ${urlProjectId}`);
    console.log(`   URL: ${url}\n`);

    // Decode Service Key
    const decodedKey = parseJwt(serviceKey);

    console.log(`2️⃣ CLAVE SERVICE_ROLE (.env.local):`);
    if (decodedKey) {
        console.log(`   Pertenece al Proyecto (Reference ID): ${decodedKey.ref}`);
        console.log(`   Role: ${decodedKey.role}`);

        if (decodedKey.ref !== urlProjectId) {
            console.log(`\n❌ ¡ERROR CRÍTICO DETECTADO! ❌`);
            console.log(`La URL apunta al proyecto "${urlProjectId}"`);
            console.log(`Pero la Clave Service apunta al proyecto "${decodedKey.ref}"`);
            console.log(`Son proyectos DIFERENTES. Por eso falla.`);
        } else {
            console.log(`\n✅ Los IDs coinciden. La clave parece correcta en estructura.`);
        }
    } else {
        console.log(`   ❌ No se pudo decodificar la clave. ¿Está cortada?`);
    }

    console.log('\n3️⃣ INTENTANDO CONECTAR REALMENTE...');
    try {
        const supabase = createClient(url, serviceKey);
        // Try a simple query that requires service role (fetching users or checking a protected table)
        const { data, error } = await supabase.from('channels').select('count').limit(1);

        if (error) {
            console.log(`❌ Falló la conexión: ${error.message}`);
        } else {
            console.log(`✅ ¡Conexión exitosa! La base de datos respondió.`);
        }
    } catch (e) {
        console.log(`❌ Error de conexión: ${e.message}`);
    }
}

testConnection();

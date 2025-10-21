#!/usr/bin/env node

/**
 * TEST COMPANY VALUES API
 * Test the API endpoint and see detailed response
 */

const http = require('http');

async function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const req = http.request(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, headers: res.headers });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function testAPI() {
    console.log('🧪 Testing Company Values API');
    console.log('==============================');
    
    try {
        const response = await makeRequest('http://localhost:3000/api/company-values');
        
        console.log('📊 Response Status:', response.status);
        console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
        
        if (response.data.success) {
            console.log('✅ API call successful');
            console.log('📊 Company Values Count:', response.data.data?.length || 0);
            
            if (response.data.data && response.data.data.length > 0) {
                console.log('\n📋 Company Values:');
                response.data.data.forEach((value, index) => {
                    console.log(`${index + 1}. ${value.name} (${value.sort_order})`);
                    console.log(`   Active: ${value.is_active}`);
                });
            } else {
                console.log('⚠️  No company values returned from API');
            }
        } else {
            console.log('❌ API call failed:', response.data.error || 'Unknown error');
        }
        
        // Test health endpoint for comparison
        console.log('\n🏥 Testing Health Endpoint for comparison...');
        const healthResponse = await makeRequest('http://localhost:3000/api/health');
        console.log('Health Status:', healthResponse.status);
        console.log('Database Connected:', healthResponse.data?.data?.database?.connected);
        console.log('Database Latency:', healthResponse.data?.data?.database?.latency + 'ms');
        
    } catch (error) {
        console.log('💥 Error testing API:', error.message);
    }
}

testAPI().catch(console.error);

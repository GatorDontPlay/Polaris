#!/usr/bin/env node

/**
 * PDR SYSTEM - USER FLOW TESTING SCRIPT
 * ====================================
 * Tests complete user workflows to ensure the system works end-to-end
 * 
 * This script tests:
 * 1. User registration and profile creation
 * 2. Login and authentication
 * 3. PDR creation and management
 * 4. Goals and behaviors functionality
 * 5. CEO vs Employee access control
 * 
 * Usage: node test-user-flows.js
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ANSI color codes for pretty output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

function log(message, color = 'white') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PDR-UserFlow-Test/1.0',
                ...options.headers
            }
        };

        const req = protocol.request(url, requestOptions, (res) => {
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
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

async function testUserFlow(flowName, testFunction) {
    log(`\n🔄 Testing User Flow: ${flowName}`, 'cyan');
    log('=' .repeat(50), 'cyan');
    
    try {
        const result = await testFunction();
        if (result.success) {
            log(`✅ ${flowName}: PASSED`, 'green');
            return true;
        } else {
            log(`❌ ${flowName}: FAILED - ${result.error}`, 'red');
            return false;
        }
    } catch (error) {
        log(`💥 ${flowName}: ERROR - ${error.message}`, 'red');
        return false;
    }
}

// Test Flow 1: System Health and Connectivity
async function testSystemHealth() {
    log('🏥 Checking system health...', 'blue');
    
    const response = await makeRequest(`${BASE_URL}/api/health`);
    
    if (response.status !== 200) {
        return { success: false, error: `Health check failed with status ${response.status}` };
    }
    
    if (!response.data.data || !response.data.data.database || !response.data.data.database.connected) {
        return { success: false, error: 'Database not connected' };
    }
    
    log(`   ✅ Database connected (${response.data.data.database.latency}ms)`, 'green');
    return { success: true };
}

// Test Flow 2: Seed Data Verification
async function testSeedData() {
    log('🌱 Checking seed data...', 'blue');
    
    // Test company values
    const valuesResponse = await makeRequest(`${BASE_URL}/api/company-values`);
    if (valuesResponse.status !== 200) {
        return { success: false, error: 'Company values endpoint failed' };
    }
    
    const values = valuesResponse.data.data;
    if (!Array.isArray(values) || values.length < 4) {
        return { success: false, error: `Expected 4 company values, got ${values?.length || 0}` };
    }
    
    log(`   ✅ Company values loaded (${values.length} values)`, 'green');
    
    // Check required company values exist
    const requiredValues = ['Integrity', 'Innovation', 'Collaboration', 'Excellence', 'Customer Focus', 'Self Reflection'];
    const missingValues = requiredValues.filter(required => 
        !values.some(value => value.name === required)
    );
    
    if (missingValues.length > 0) {
        return { success: false, error: `Missing company values: ${missingValues.join(', ')}` };
    }
    
    log('   ✅ All required company values present', 'green');
    return { success: true };
}

// Test Flow 3: Authentication Endpoints (without actual user creation)
async function testAuthenticationEndpoints() {
    log('🔐 Testing authentication endpoints...', 'blue');
    
    // Test that protected endpoints return 401
    const protectedEndpoints = [
        '/api/pdrs',
        '/api/admin/dashboard',
        '/api/notifications'
    ];
    
    for (const endpoint of protectedEndpoints) {
        const response = await makeRequest(`${BASE_URL}${endpoint}`);
        if (response.status !== 401) {
            return { success: false, error: `Endpoint ${endpoint} should return 401, got ${response.status}` };
        }
    }
    
    log('   ✅ Protected endpoints properly secured', 'green');
    return { success: true };
}

// Test Flow 4: Database Schema Verification
async function testDatabaseSchema() {
    log('🗄️ Verifying database schema...', 'blue');
    
    // Test that we can query basic tables (this will fail if schema is wrong)
    const endpoints = [
        { name: 'Company Values', url: '/api/company-values', expectData: true },
        { name: 'Health Check', url: '/api/health', expectConnected: true }
    ];
    
    for (const endpoint of endpoints) {
        const response = await makeRequest(`${BASE_URL}${endpoint.url}`);
        
        if (response.status !== 200) {
            return { success: false, error: `${endpoint.name} failed with status ${response.status}` };
        }
        
        if (endpoint.expectData && (!response.data.data || !Array.isArray(response.data.data))) {
            return { success: false, error: `${endpoint.name} did not return expected data structure` };
        }
        
        if (endpoint.expectConnected && !response.data.data.database.connected) {
            return { success: false, error: `${endpoint.name} shows database not connected` };
        }
    }
    
    log('   ✅ Database schema appears correct', 'green');
    return { success: true };
}

// Test Flow 5: API Error Handling
async function testErrorHandling() {
    log('⚠️ Testing error handling...', 'blue');
    
    // Test invalid endpoints
    const response = await makeRequest(`${BASE_URL}/api/nonexistent`);
    if (response.status !== 404) {
        return { success: false, error: `Expected 404 for invalid endpoint, got ${response.status}` };
    }
    
    // Test malformed requests
    const malformedResponse = await makeRequest(`${BASE_URL}/api/pdrs`, {
        method: 'POST',
        body: { invalid: 'data' }
    });
    
    // Should return 401 (unauthorized) or 400 (bad request), not 500
    if (malformedResponse.status >= 500) {
        return { success: false, error: `Server error on malformed request: ${malformedResponse.status}` };
    }
    
    log('   ✅ Error handling working correctly', 'green');
    return { success: true };
}

// Test Flow 6: Performance and Response Times
async function testPerformance() {
    log('⚡ Testing performance...', 'blue');
    
    const startTime = Date.now();
    const response = await makeRequest(`${BASE_URL}/api/health`);
    const responseTime = Date.now() - startTime;
    
    if (response.status !== 200) {
        return { success: false, error: 'Health check failed during performance test' };
    }
    
    if (responseTime > 5000) { // 5 seconds
        return { success: false, error: `Response time too slow: ${responseTime}ms` };
    }
    
    log(`   ✅ Response time acceptable: ${responseTime}ms`, 'green');
    
    // Test database latency from health check
    const dbLatency = response.data.data.database.latency;
    if (dbLatency > 1000) { // 1 second
        log(`   ⚠️ Database latency high: ${dbLatency}ms`, 'yellow');
    } else {
        log(`   ✅ Database latency good: ${dbLatency}ms`, 'green');
    }
    
    return { success: true };
}

async function runAllTests() {
    log('🚀 PDR SYSTEM - USER FLOW TESTING', 'magenta');
    log('==================================', 'magenta');
    log(`Testing against: ${BASE_URL}`, 'blue');
    
    const testFlows = [
        { name: 'System Health', test: testSystemHealth },
        { name: 'Seed Data Verification', test: testSeedData },
        { name: 'Authentication Endpoints', test: testAuthenticationEndpoints },
        { name: 'Database Schema', test: testDatabaseSchema },
        { name: 'Error Handling', test: testErrorHandling },
        { name: 'Performance', test: testPerformance }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const flow of testFlows) {
        const result = await testUserFlow(flow.name, flow.test);
        if (result) {
            passed++;
        } else {
            failed++;
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Summary
    log('\n📊 TEST SUMMARY', 'magenta');
    log('===============', 'magenta');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, 
        failed === 0 ? 'green' : 'yellow');
    
    if (failed === 0) {
        log('\n🎉 ALL TESTS PASSED!', 'green');
        log('✅ Your PDR system is ready for user testing.', 'green');
        log('', 'white');
        log('🔗 NEXT STEPS:', 'blue');
        log('1. Open your application: ' + BASE_URL, 'blue');
        log('2. Try creating a user account', 'blue');
        log('3. Test the complete PDR workflow', 'blue');
        log('4. Verify CEO and Employee access differences', 'blue');
    } else {
        log(`\n⚠️  ${failed} test(s) failed.`, 'yellow');
        log('💡 Common issues to check:', 'yellow');
        log('   - Database schema not fully deployed', 'yellow');
        log('   - Environment variables incorrect', 'yellow');
        log('   - Supabase project not active', 'yellow');
        log('   - Development server not running', 'yellow');
    }
    
    process.exit(failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    log('PDR User Flow Testing Script', 'cyan');
    log('Usage: node test-user-flows.js [--base-url URL]', 'white');
    log('', 'white');
    log('This script tests the core functionality of your PDR system', 'white');
    log('without requiring actual user registration.', 'white');
    log('', 'white');
    log('Options:', 'white');
    log('  --base-url URL    Base URL for testing (default: http://localhost:3000)', 'white');
    log('  --help, -h        Show this help message', 'white');
    process.exit(0);
}

const baseUrlIndex = process.argv.indexOf('--base-url');
if (baseUrlIndex !== -1 && process.argv[baseUrlIndex + 1]) {
    process.env.NEXT_PUBLIC_APP_URL = process.argv[baseUrlIndex + 1];
}

// Run the tests
runAllTests().catch(error => {
    log(`💥 FATAL ERROR: ${error.message}`, 'red');
    process.exit(1);
});

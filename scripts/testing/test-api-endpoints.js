#!/usr/bin/env node

/**
 * PDR SYSTEM - API ENDPOINT TESTING SCRIPT
 * ========================================
 * Run this script to verify all critical API endpoints are working
 * after database deployment and environment setup.
 * 
 * Usage: node test-api-endpoints.js
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
                'User-Agent': 'PDR-API-Test/1.0',
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

async function testEndpoint(name, url, expectedStatus = 200, options = {}) {
    try {
        log(`\n🧪 Testing: ${name}`, 'cyan');
        log(`   URL: ${url}`, 'blue');
        
        const response = await makeRequest(url, options);
        
        if (response.status === expectedStatus) {
            log(`   ✅ SUCCESS: ${response.status}`, 'green');
            if (response.data && typeof response.data === 'object') {
                if (response.data.success !== undefined) {
                    log(`   📊 Response: success=${response.data.success}`, 'green');
                }
                if (response.data.data && Array.isArray(response.data.data)) {
                    log(`   📊 Data count: ${response.data.data.length}`, 'green');
                } else if (response.data.data) {
                    log(`   📊 Data type: ${typeof response.data.data}`, 'green');
                }
            }
            return true;
        } else {
            log(`   ❌ FAILED: Expected ${expectedStatus}, got ${response.status}`, 'red');
            if (response.data && response.data.error) {
                log(`   💥 Error: ${response.data.error}`, 'red');
            }
            return false;
        }
    } catch (error) {
        log(`   💥 ERROR: ${error.message}`, 'red');
        return false;
    }
}

async function runTests() {
    log('🚀 PDR SYSTEM - API ENDPOINT TESTING', 'magenta');
    log('=====================================', 'magenta');
    log(`Base URL: ${BASE_URL}`, 'blue');
    
    const tests = [
        // Core system tests
        {
            name: 'Health Check',
            url: `${BASE_URL}/api/health`,
            expectedStatus: 200,
            description: 'Verifies database connection and system status'
        },
        
        // Public data endpoints (no auth required)
        {
            name: 'Company Values',
            url: `${BASE_URL}/api/company-values`,
            expectedStatus: 200,
            description: 'Should return 6 company values from seed data'
        },
        
        // Authentication required endpoints (will return 401 without auth)
        {
            name: 'PDR List (No Auth)',
            url: `${BASE_URL}/api/pdrs`,
            expectedStatus: 401,
            description: 'Should reject without authentication'
        },
        
        {
            name: 'Admin Dashboard (No Auth)',
            url: `${BASE_URL}/api/admin/dashboard`,
            expectedStatus: 401,
            description: 'Should reject without authentication'
        },
        
        // Test POST endpoints (should also return 401 without auth)
        {
            name: 'Create PDR (No Auth)',
            url: `${BASE_URL}/api/pdrs`,
            expectedStatus: 401,
            options: {
                method: 'POST',
                body: {
                    fyLabel: 'FY 2024-2025',
                    fyStartDate: '2024-07-01',
                    fyEndDate: '2025-06-30'
                }
            },
            description: 'Should reject PDR creation without authentication'
        }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        const result = await testEndpoint(
            test.name, 
            test.url, 
            test.expectedStatus, 
            test.options
        );
        
        if (result) {
            passed++;
        } else {
            failed++;
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    log('\n📊 TEST SUMMARY', 'magenta');
    log('===============', 'magenta');
    log(`✅ Passed: ${passed}`, 'green');
    log(`❌ Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`, 
        failed === 0 ? 'green' : 'yellow');
    
    if (failed === 0) {
        log('\n🎉 ALL TESTS PASSED! Your API endpoints are working correctly.', 'green');
        log('✅ Ready for user authentication testing.', 'green');
    } else {
        log(`\n⚠️  ${failed} test(s) failed. Check the errors above.`, 'yellow');
        log('💡 Common issues:', 'yellow');
        log('   - Development server not running (npm run dev)', 'yellow');
        log('   - Database not deployed or configured correctly', 'yellow');
        log('   - Environment variables not set', 'yellow');
    }
    
    log('\n🔗 NEXT STEPS:', 'blue');
    log('1. If health check passes: Database connection is working', 'blue');
    log('2. If company values returns data: Seed data is loaded', 'blue');
    log('3. If auth endpoints return 401: Authentication is working', 'blue');
    log('4. Ready to test user registration and login flows', 'blue');
    
    process.exit(failed > 0 ? 1 : 0);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    log('PDR API Testing Script', 'cyan');
    log('Usage: node test-api-endpoints.js [--base-url URL]', 'white');
    log('', 'white');
    log('Options:', 'white');
    log('  --base-url URL    Base URL for API testing (default: http://localhost:3000)', 'white');
    log('  --help, -h        Show this help message', 'white');
    process.exit(0);
}

const baseUrlIndex = process.argv.indexOf('--base-url');
if (baseUrlIndex !== -1 && process.argv[baseUrlIndex + 1]) {
    process.env.NEXT_PUBLIC_APP_URL = process.argv[baseUrlIndex + 1];
}

// Run the tests
runTests().catch(error => {
    log(`💥 FATAL ERROR: ${error.message}`, 'red');
    process.exit(1);
});

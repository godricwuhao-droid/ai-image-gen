#!/usr/bin/env node
/**
 * 管理后台前端代码测试脚本
 * 用法: node test_frontend.js
 */

const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('🧪 管理后台前端代码测试');
console.log('='.repeat(60));

const baseDir = path.join(__dirname, 'src');
const results = [];


function testFileExistence() {
    console.log('\n' + '='.repeat(60));
    console.log('测试1: 文件存在性检查');
    console.log('='.repeat(60));

    const requiredFiles = [
        'services/api.ts',
        'pages/Users/List.tsx',
        'pages/Orders/List.tsx',
        'pages/Generations/List.tsx',
        'pages/Credits/Manage.tsx',
        'pages/Dashboard.tsx',
        'pages/Login.tsx',
        '.umirc.ts',
    ];

    let allExist = true;
    for (const file of requiredFiles) {
        const filePath = path.join(baseDir, file);
        const exists = fs.existsSync(filePath);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${file}`);
        if (!exists) allExist = false;
    }

    return allExist;
}


function testImportPaths() {
    console.log('\n' + '='.repeat(60));
    console.log('测试2: 导入路径检查');
    console.log('='.repeat(60));

    const pageFiles = [
        'pages/Users/List.tsx',
        'pages/Orders/List.tsx',
        'pages/Generations/List.tsx',
        'pages/Credits/Manage.tsx',
    ];

    let allCorrect = true;

    for (const file of pageFiles) {
        const filePath = path.join(baseDir, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`   ⚠️  ${file}: 文件不存在`);
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');

        const expectedImport = '../../services/api';
        const wrongImport = '../services/api';

        if (content.includes(wrongImport)) {
            console.log(`   ❌ ${file}: 包含错误的导入路径 "${wrongImport}"`);
            allCorrect = false;
        } else if (content.includes(expectedImport)) {
            console.log(`   ✅ ${file}: 导入路径正确`);
        } else {
            console.log(`   ⚠️  ${file}: 未找到services/api导入`);
        }
    }

    return allCorrect;
}


function testApiServiceMethods() {
    console.log('\n' + '='.repeat(60));
    console.log('测试3: API服务方法检查');
    console.log('='.repeat(60));

    const apiFile = path.join(baseDir, 'services/api.ts');
    
    if (!fs.existsSync(apiFile)) {
        console.log('   ❌ api.ts 文件不存在');
        return false;
    }

    const content = fs.readFileSync(apiFile, 'utf-8');

    const requiredMethods = [
        'userService',
        'orderService',
        'generationService',
        'creditService',
        'statsService',
        'authService',
    ];

    let allExist = true;
    for (const method of requiredMethods) {
        const exists = content.includes(`export const ${method}`);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} ${method}`);
        if (!exists) allExist = false;
    }

    return allExist;
}


function testGenerationService() {
    console.log('\n' + '='.repeat(60));
    console.log('测试4: 生成记录服务方法检查');
    console.log('='.repeat(60));

    const apiFile = path.join(baseDir, 'services/api.ts');
    const content = fs.readFileSync(apiFile, 'utf-8');

    const genServiceMatch = content.match(/export const generationService = \{([\s\S]*?)\n\};/);
    if (!genServiceMatch) {
        console.log('   ❌ 未找到generationService定义');
        return false;
    }

    const genServiceContent = genServiceMatch[1];
    const requiredMethods = [
        'getAdminList',
        'getAdminById',
        'update',
        'delete',
        'retry',
    ];

    let allExist = true;
    for (const method of requiredMethods) {
        const exists = genServiceContent.includes(method);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} generationService.${method}`);
        if (!exists) allExist = false;
    }

    return allExist;
}


function testCreditService() {
    console.log('\n' + '='.repeat(60));
    console.log('测试5: 积分服务方法检查');
    console.log('='.repeat(60));

    const apiFile = path.join(baseDir, 'services/api.ts');
    const content = fs.readFileSync(apiFile, 'utf-8');

    const creditServiceMatch = content.match(/export const creditService = \{([\s\S]*?)\n\};/);
    if (!creditServiceMatch) {
        console.log('   ❌ 未找到creditService定义');
        return false;
    }

    const creditServiceContent = creditServiceMatch[1];
    const requiredMethods = [
        'getUserCredits',
        'getUserCreditDetail',
        'getTransactions',
        'recharge',
        'deduct',
    ];

    let allExist = true;
    for (const method of requiredMethods) {
        const exists = creditServiceContent.includes(method);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} creditService.${method}`);
        if (!exists) allExist = false;
    }

    return allExist;
}


function testRoutes() {
    console.log('\n' + '='.repeat(60));
    console.log('测试6: 路由配置检查');
    console.log('='.repeat(60));

    const umircFile = path.join(__dirname, '.umirc.ts');
    
    if (!fs.existsSync(umircFile)) {
        console.log('   ❌ .umirc.ts 文件不存在');
        return false;
    }

    const content = fs.readFileSync(umircFile, 'utf-8');

    const requiredRoutes = [
        '/dashboard',
        '/users',
        '/generations',
        '/orders',
        '/credits',
    ];

    let allExist = true;
    for (const route of requiredRoutes) {
        const exists = content.includes(`path: '${route}'`);
        const status = exists ? '✅' : '❌';
        console.log(`   ${status} 路由 ${route}`);
        if (!exists) allExist = false;
    }

    return allExist;
}


function main() {
    try {
        results.push(['文件存在', testFileExistence()]);
        results.push(['导入路径', testImportPaths()]);
        results.push(['API服务', testApiServiceMethods()]);
        results.push(['生成服务', testGenerationService()]);
        results.push(['积分服务', testCreditService()]);
        results.push(['路由配置', testRoutes()]);

        console.log('\n' + '='.repeat(60));
        console.log('📊 测试结果汇总');
        console.log('='.repeat(60));

        let allPassed = true;
        for (const [name, passed] of results) {
            const status = passed ? '✅ 通过' : '❌ 失败';
            console.log(`   ${name}: ${status}`);
            if (!passed) allPassed = false;
        }

        console.log('\n' + '='.repeat(60));
        if (allPassed) {
            console.log('🎉 所有前端测试通过！');
            console.log('\n后续步骤:');
            console.log('1. 启动前端开发服务器: cd admin && npm run dev');
            console.log('2. 访问 http://localhost:8001');
        } else {
            console.log('⚠️  部分前端测试失败，请检查错误信息');
        }
        console.log('='.repeat(60) + '\n');

        process.exit(allPassed ? 0 : 1);
    } catch (error) {
        console.error('\n❌ 测试过程出错:', error.message);
        process.exit(1);
    }
}

main();
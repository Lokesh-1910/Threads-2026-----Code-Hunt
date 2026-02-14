// piston-executor.js
const axios = require('axios');

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_VERSIONS = {
    'python': '3.10.0',
    'javascript': '18.15.0',
    'java': '15.0.2',
    'cpp': '10.2.0',
    'c': '10.2.0',
    'csharp': '6.0.0',
    'ruby': '3.0.0',
    'go': '1.16.0',
    'rust': '1.68.0',
    'php': '8.0.0'
};

class CodeExecutor {
    static async executeCode(language, code, input = '') {
        try {
            console.log(`🚀 Executing ${language} code with Piston API...`);
            
            const startTime = Date.now();
            
            const response = await axios.post(PISTON_API, {
                language: language,
                version: LANGUAGE_VERSIONS[language] || 'latest',
                files: [
                    {
                        name: this.getFileName(language),
                        content: this.wrapCodeWithInput(code, language, input)
                    }
                ],
                stdin: input,
                args: [],
                compile_timeout: 10000,
                run_timeout: 5000,
                memory_limit: 256
            });

            const executionTime = Date.now() - startTime;

            console.log(`✅ Code executed in ${executionTime}ms`);

            return {
                success: true,
                output: response.data.run?.output || '',
                stdout: response.data.run?.stdout || '',
                stderr: response.data.run?.stderr || '',
                error: response.data.run?.stderr || null,
                execution_time: executionTime,
                memory: response.data.run?.memory || 0,
                code: response.data.run?.code || 0,
                signal: response.data.run?.signal || null
            };

        } catch (error) {
            console.error('❌ Piston API error:', error.message);
            
            return {
                success: false,
                output: '',
                stdout: '',
                stderr: error.message,
                error: error.message,
                execution_time: 0,
                memory: 0,
                code: -1,
                signal: null
            };
        }
    }

    static getFileName(language) {
        const extensions = {
            'python': 'main.py',
            'javascript': 'main.js',
            'java': 'Main.java',
            'cpp': 'main.cpp',
            'c': 'main.c',
            'csharp': 'main.cs',
            'ruby': 'main.rb',
            'go': 'main.go',
            'rust': 'main.rs',
            'php': 'main.php'
        };
        return extensions[language] || 'main.txt';
    }

    static wrapCodeWithInput(code, language, input) {
        // For Python - handle input properly
        if (language === 'python') {
            return code;
        }
        
        // For Java - ensure class name is Main and handle input
        if (language === 'java') {
            // Replace class name with Main
            let javaCode = code.replace(/public\s+class\s+\w+/, 'public class Main');
            
            // Add import for Scanner if not present
            if (!javaCode.includes('import java.util.Scanner') && !javaCode.includes('import java.util.*')) {
                javaCode = 'import java.util.Scanner;\n' + javaCode;
            }
            
            return javaCode;
        }
        
        // For C/C++ - ensure proper includes
        if (language === 'cpp' || language === 'c') {
            if (!code.includes('#include <iostream>') && language === 'cpp') {
                code = '#include <iostream>\nusing namespace std;\n' + code;
            }
            if (!code.includes('#include <stdio.h>') && language === 'c') {
                code = '#include <stdio.h>\n' + code;
            }
            return code;
        }
        
        return code;
    }

    static async runTestCases(code, language, testCases) {
        const results = [];
        let passedCount = 0;
        let totalScore = 0;
        let totalExecutionTime = 0;

        console.log(`🧪 Running ${testCases.length} test cases...`);

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`   Test case ${i + 1}: ${testCase.is_hidden ? '🔒 Hidden' : '📖 Sample'}`);
            
            const result = await this.executeCode(language, code, testCase.input);
            
            const passed = result.success && this.compareOutput(result.stdout, testCase.expected_output);
            
            const testResult = {
                ...testCase,
                passed,
                actual_output: result.stdout,
                error: result.error,
                execution_time: result.execution_time,
                memory: result.memory,
                status: result.success ? (passed ? 'PASSED' : 'WRONG_ANSWER') : 'RUNTIME_ERROR'
            };

            results.push(testResult);
            
            if (passed) {
                passedCount++;
                totalScore += testCase.score || 0;
            }
            
            totalExecutionTime += result.execution_time;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`📊 Results: ${passedCount}/${testCases.length} passed, Score: ${totalScore}`);

        return {
            results,
            passedCount,
            totalScore,
            totalTestCases: testCases.length,
            averageExecutionTime: Math.round(totalExecutionTime / testCases.length)
        };
    }

    static compareOutput(actual, expected) {
        // Normalize both outputs
        const normalize = (str) => {
            if (!str) return '';
            
            return str
                .toString()
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .trim()
                .split('\n')
                .map(line => line.trim())
                .filter(line => line !== '')
                .join('\n');
        };

        const normalizedActual = normalize(actual);
        const normalizedExpected = normalize(expected);

        // Try exact match first
        if (normalizedActual === normalizedExpected) {
            return true;
        }

        // Try numeric comparison for numbers
        try {
            const actualNum = parseFloat(normalizedActual);
            const expectedNum = parseFloat(normalizedExpected);
            
            if (!isNaN(actualNum) && !isNaN(expectedNum)) {
                // Allow small floating point differences
                return Math.abs(actualNum - expectedNum) < 0.0001;
            }
        } catch (e) {
            // Not numbers, ignore
        }

        // Try case-insensitive comparison
        if (normalizedActual.toLowerCase() === normalizedExpected.toLowerCase()) {
            return true;
        }

        return false;
    }

    static async validateLanguage(language) {
        return LANGUAGE_VERSIONS.hasOwnProperty(language);
    }

    static getSupportedLanguages() {
        return Object.keys(LANGUAGE_VERSIONS);
    }
}

module.exports = CodeExecutor;
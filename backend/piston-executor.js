// piston-executor.js
const axios = require('axios');

const PISTON_API = 'https://emkc.org/api/v2/piston/execute';

const LANGUAGE_VERSIONS = {
    'python': '3.10.0',
    'javascript': '18.15.0',
    'java': '15.0.2',
    'cpp': '10.2.0',
    'c': '10.2.0'
};

class CodeExecutor {
    static async executeCode(language, code, input = '') {
        try {
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

            return {
                success: true,
                output: response.data.run?.output || '',
                stdout: response.data.run?.stdout || '',
                stderr: response.data.run?.stderr || '',
                error: response.data.run?.stderr || null,
                execution_time: response.data.run?.time || 0,
                memory: response.data.run?.memory || 0
            };

        } catch (error) {
            console.error('Piston API error:', error);
            return {
                success: false,
                output: '',
                stdout: '',
                stderr: error.message,
                error: error.message,
                execution_time: 0,
                memory: 0
            };
        }
    }

    static getFileName(language) {
        const extensions = {
            'python': 'main.py',
            'javascript': 'main.js',
            'java': 'Main.java',
            'cpp': 'main.cpp',
            'c': 'main.c'
        };
        return extensions[language] || 'main.txt';
    }

    static wrapCodeWithInput(code, language, input) {
        // For Python - handle input
        if (language === 'python') {
            return code;
        }
        // For Java - ensure class name is Main
        if (language === 'java') {
            return code.replace(/public\s+class\s+\w+/, 'public class Main');
        }
        return code;
    }

    static async runTestCases(code, language, testCases) {
        const results = [];
        let passedCount = 0;
        let totalScore = 0;

        for (const testCase of testCases) {
            const result = await this.executeCode(language, code, testCase.input);
            
            const passed = this.compareOutput(result.stdout.trim(), testCase.expected_output.trim());
            
            results.push({
                ...testCase,
                passed,
                actual_output: result.stdout.trim(),
                error: result.error,
                execution_time: result.execution_time,
                memory: result.memory
            });

            if (passed) {
                passedCount++;
                totalScore += testCase.score;
            }
        }

        return {
            results,
            passedCount,
            totalScore,
            totalTestCases: testCases.length
        };
    }

    static compareOutput(actual, expected) {
        // Normalize both outputs
        const normalize = (str) => {
            return str
                .replace(/\r\n/g, '\n')
                .replace(/\r/g, '\n')
                .trim()
                .split('\n')
                .map(line => line.trim())
                .join('\n');
        };

        return normalize(actual) === normalize(expected);
    }
}

module.exports = CodeExecutor;
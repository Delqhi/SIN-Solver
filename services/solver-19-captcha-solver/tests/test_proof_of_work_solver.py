"""
Unit Tests for Proof-of-Work Captcha Solver
============================================
Tests for ALTCHA-style proof-of-work challenge solving.
"""

import pytest
import asyncio
from src.solvers.proof_of_work_solver import (
    ProofOfWorkSolver,
    AltchaDetector,
    PoWChallenge,
    solve_altcha_challenge,
    solve_altcha_sync
)


class TestPoWChallenge:
    """Test PoWChallenge dataclass"""
    
    def test_from_dict_basic(self):
        data = {
            'algorithm': 'SHA-256',
            'challenge': 'abc123',
            'salt': 'xyz789',
            'signature': 'sig456',
            'difficulty': 5000,
            'maxnumber': 1000000
        }
        challenge = PoWChallenge.from_dict(data)
        
        assert challenge.algorithm == 'SHA-256'
        assert challenge.challenge == 'abc123'
        assert challenge.salt == 'xyz789'
        assert challenge.signature == 'sig456'
        assert challenge.difficulty == 5000
        assert challenge.max_iterations == 1000000
    
    def test_from_dict_defaults(self):
        data = {
            'challenge': 'abc123',
            'salt': 'xyz789'
        }
        challenge = PoWChallenge.from_dict(data)
        
        assert challenge.algorithm == 'SHA-256'
        assert challenge.difficulty == 5000
        assert challenge.max_iterations == 1000000
        assert challenge.signature == ''
    
    def test_to_dict(self):
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='abc123',
            salt='xyz789',
            signature='sig456',
            difficulty=5000
        )
        
        data = challenge.to_dict()
        
        assert data['algorithm'] == 'SHA-256'
        assert data['challenge'] == 'abc123'
        assert data['salt'] == 'xyz789'
        assert data['signature'] == 'sig456'
        assert data['difficulty'] == 5000


class TestProofOfWorkSolver:
    """Test ProofOfWorkSolver functionality"""
    
    def setup_method(self):
        self.solver = ProofOfWorkSolver(max_workers=2)
    
    def test_simple_pow_solve(self):
        """Test solving a very easy challenge (difficulty=100000)"""
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='test_challenge',
            salt='test_salt',
            signature='test_sig',
            difficulty=100000,  # Very easy for testing
            max_iterations=10000
        )
        
        result = self.solver.solve_sync(challenge, timeout=10.0)
        
        assert result['success'] is True or 'number' in result
        assert result['took'] > 0
        assert result['time_ms'] > 0
        assert result['verified'] is True
        assert 'challenge' in result
    
    def test_solution_verification(self):
        """Test that solutions can be verified"""
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='verify_test',
            salt='verify_salt',
            signature='verify_sig',
            difficulty=100000,
            max_iterations=10000
        )
        
        result = self.solver.solve_sync(challenge, timeout=10.0)
        number = result['number']
        
        # Verify the solution
        is_valid = self.solver.verify_solution(challenge, number)
        assert is_valid is True
        
        # Verify that wrong number fails
        is_invalid = self.solver.verify_solution(challenge, number + 1)
        assert is_invalid is False
    
    def test_timeout(self):
        """Test timeout handling"""
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='timeout_test',
            salt='timeout_salt',
            signature='timeout_sig',
            difficulty=1,  # Impossible difficulty
            max_iterations=100000000
        )
        
        with pytest.raises(TimeoutError):
            self.solver.solve_sync(challenge, timeout=0.001)  # 1ms timeout
    
    def test_estimate_solve_time(self):
        """Test solve time estimation"""
        # Very easy difficulty
        time_easy = self.solver.estimate_solve_time(difficulty=50000, hash_rate=100000)
        assert time_easy > 0
        
        # Harder difficulty
        time_hard = self.solver.estimate_solve_time(difficulty=5000, hash_rate=100000)
        assert time_hard > time_easy
    
    @pytest.mark.asyncio
    async def test_async_solve(self):
        """Test async solve method"""
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='async_test',
            salt='async_salt',
            signature='async_sig',
            difficulty=100000,
            max_iterations=10000
        )
        
        result = await self.solver.solve(challenge, timeout=10.0)
        
        assert 'number' in result
        assert result['took'] > 0
        assert result['verified'] is True
    
    @pytest.mark.asyncio
    async def test_batch_solve(self):
        """Test batch solving multiple challenges"""
        challenges = [
            PoWChallenge(
                algorithm='SHA-256',
                challenge=f'batch_test_{i}',
                salt=f'batch_salt_{i}',
                signature=f'batch_sig_{i}',
                difficulty=100000,
                max_iterations=10000
            )
            for i in range(3)
        ]
        
        results = await self.solver.solve_batch(challenges, timeout_per_challenge=10.0)
        
        assert len(results) == 3
        for result in results:
            if not isinstance(result, Exception):
                assert 'number' in result
                assert result['verified'] is True


class TestAltchaDetector:
    """Test AltchaDetector functionality"""
    
    def setup_method(self):
        self.detector = AltchaDetector()
    
    def test_detect_in_html_positive(self):
        """Test detecting ALTCHA in HTML"""
        html = '''
        <html>
        <body>
            <div data-altcha="true">
                <input type="hidden" data-challenge="abc123" data-salt="xyz789" />
            </div>
        </body>
        </html>
        '''
        
        is_altcha = self.detector.detect_in_html(html)
        assert is_altcha is True
    
    def test_detect_in_html_negative(self):
        """Test that regular HTML doesn't match"""
        html = '''
        <html>
        <body>
            <form>
                <input type="text" name="username" />
            </form>
        </body>
        </html>
        '''
        
        is_altcha = self.detector.detect_in_html(html)
        assert is_altcha is False
    
    def test_extract_challenge_success(self):
        """Test extracting challenge from HTML"""
        html = '''
        <div class="altcha-widget" 
             data-challenge="test_challenge_123"
             data-salt="test_salt_456"
             data-algorithm="SHA-256"
             data-signature="test_sig_789"
             data-difficulty="5000">
        </div>
        '''
        
        challenge = self.detector.extract_challenge(html)
        
        assert challenge is not None
        assert challenge.challenge == "test_challenge_123"
        assert challenge.salt == "test_salt_456"
        assert challenge.algorithm == "SHA-256"
        assert challenge.signature == "test_sig_789"
        assert challenge.difficulty == 5000
    
    def test_extract_challenge_missing_data(self):
        """Test extraction when required fields are missing"""
        html = '''
        <div class="altcha-widget" data-challenge="only_challenge"></div>
        '''
        
        challenge = self.detector.extract_challenge(html)
        assert challenge is None
    
    def test_extract_from_api_response(self):
        """Test extracting from API response dict"""
        response = {
            'algorithm': 'SHA-256',
            'challenge': 'api_challenge',
            'salt': 'api_salt',
            'signature': 'api_sig',
            'difficulty': 10000
        }
        
        challenge = self.detector.extract_from_api_response(response)
        
        assert challenge is not None
        assert challenge.challenge == 'api_challenge'
        assert challenge.salt == 'api_salt'


class TestConvenienceFunctions:
    """Test convenience functions"""
    
    @pytest.mark.asyncio
    async def test_solve_altcha_challenge(self):
        """Test async convenience function"""
        challenge_dict = {
            'algorithm': 'SHA-256',
            'challenge': 'convenience_test',
            'salt': 'convenience_salt',
            'signature': 'convenience_sig',
            'difficulty': 100000,
            'maxnumber': 10000
        }
        
        result = await solve_altcha_challenge(challenge_dict, timeout=10.0)
        
        assert 'number' in result
        assert result['verified'] is True
    
    def test_solve_altcha_sync(self):
        """Test sync convenience function"""
        challenge_dict = {
            'algorithm': 'SHA-256',
            'challenge': 'sync_test',
            'salt': 'sync_salt',
            'signature': 'sync_sig',
            'difficulty': 100000,
            'maxnumber': 10000
        }
        
        result = solve_altcha_sync(challenge_dict, timeout=10.0)
        
        assert 'number' in result
        assert result['verified'] is True


class TestPerformance:
    """Performance benchmarks for PoW solver"""
    
    def test_solve_time_reasonable(self):
        """Ensure solve time is reasonable for standard difficulty"""
        solver = ProofOfWorkSolver()
        challenge = PoWChallenge(
            algorithm='SHA-256',
            challenge='perf_test',
            salt='perf_salt',
            signature='perf_sig',
            difficulty=50000,  # Standard test difficulty
            max_iterations=100000
        )
        
        import time
        start = time.time()
        result = solver.solve_sync(challenge, timeout=30.0)
        elapsed_ms = (time.time() - start) * 1000
        
        # Should solve in reasonable time (less than 5 seconds for this difficulty)
        assert elapsed_ms < 5000, f"Solve took too long: {elapsed_ms}ms"
        assert result['time_ms'] < 5000
        print(f"\nPoW solve took {elapsed_ms:.2f}ms ({result['took']} iterations)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

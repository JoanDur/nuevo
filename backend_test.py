import requests
import sys
import json
from datetime import datetime

class TinderPetsAPITester:
    def __init__(self, base_url="https://petadoptai.preview.emergentagent.com"):
        self.base_url = base_url
        self.adopter_token = None
        self.foundation_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"   Response: {response.json()}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_foundation_register(self):
        """Test foundation registration"""
        foundation_data = {
            "email": f"foundation_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Foundation",
            "age": 25,
            "user_type": "foundation"
        }
        
        success, response = self.run_test(
            "Foundation Registration",
            "POST",
            "auth/register",
            200,
            data=foundation_data
        )
        
        if success and 'token' in response:
            self.foundation_token = response['token']
            self.test_data['foundation'] = response['user']
            return True
        return False

    def test_adopter_register(self):
        """Test adopter registration with personality traits"""
        adopter_data = {
            "email": f"adopter_{datetime.now().strftime('%H%M%S')}@test.com",
            "password": "TestPass123!",
            "name": "Test Adopter",
            "age": 28,
            "user_type": "adopter",
            "personality_traits": {
                "playful": 8,
                "calm": 6,
                "energetic": 7,
                "friendly": 9,
                "independent": 5,
                "social": 8
            }
        }
        
        success, response = self.run_test(
            "Adopter Registration",
            "POST",
            "auth/register",
            200,
            data=adopter_data
        )
        
        if success and 'token' in response:
            self.adopter_token = response['token']
            self.test_data['adopter'] = response['user']
            return True
        return False

    def test_login(self):
        """Test login functionality"""
        if not self.test_data.get('foundation'):
            return False
            
        login_data = {
            "email": self.test_data['foundation']['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Foundation Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        return success and 'token' in response

    def test_create_pet(self):
        """Test pet creation by foundation"""
        pet_data = {
            "name": "Buddy",
            "breed": "Golden Retriever",
            "age": 3,
            "personality_traits": {
                "playful": 9,
                "calm": 4,
                "energetic": 8,
                "friendly": 10,
                "independent": 3,
                "social": 9
            },
            "images": ["https://example.com/buddy.jpg"]
        }
        
        success, response = self.run_test(
            "Create Pet",
            "POST",
            "pets",
            200,
            data=pet_data,
            token=self.foundation_token
        )
        
        if success and 'id' in response:
            self.test_data['pet'] = response
            return True
        return False

    def test_get_foundation_pets(self):
        """Test getting foundation's pets"""
        success, response = self.run_test(
            "Get Foundation Pets",
            "GET",
            "pets",
            200,
            token=self.foundation_token
        )
        
        return success and isinstance(response, list)

    def test_get_available_pets(self):
        """Test getting available pets for adopter"""
        success, response = self.run_test(
            "Get Available Pets",
            "GET",
            "pets/available/list",
            200,
            token=self.adopter_token
        )
        
        return success and isinstance(response, list)

    def test_swipe_like(self):
        """Test swiping like on a pet"""
        if not self.test_data.get('pet'):
            return False
            
        swipe_data = {
            "pet_id": self.test_data['pet']['id'],
            "action": "like"
        }
        
        success, response = self.run_test(
            "Swipe Like",
            "POST",
            "matches/like",
            200,
            data=swipe_data,
            token=self.adopter_token
        )
        
        if success and 'match_score' in response:
            self.test_data['match'] = response
            print(f"   Match Score: {response['match_score']}%")
            print(f"   Is Match: {response['is_match']}")
            return True
        return False

    def test_get_matches(self):
        """Test getting matches"""
        success, response = self.run_test(
            "Get Matches",
            "GET",
            "matches",
            200,
            token=self.adopter_token
        )
        
        return success and isinstance(response, list)

    def test_accept_match(self):
        """Test accepting a match"""
        if not self.test_data.get('match') or not self.test_data['match'].get('is_match'):
            print("   Skipping - No successful match to accept")
            return True
            
        success, response = self.run_test(
            "Accept Match",
            "PUT",
            f"matches/{self.test_data['match']['id']}/accept",
            200,
            token=self.adopter_token
        )
        
        return success

    def test_create_appointment(self):
        """Test creating an appointment"""
        if not self.test_data.get('match') or not self.test_data['match'].get('is_match'):
            print("   Skipping - No successful match for appointment")
            return True
            
        appointment_data = {
            "match_id": self.test_data['match']['id'],
            "date": "2025-02-01",
            "time": "14:00"
        }
        
        success, response = self.run_test(
            "Create Appointment",
            "POST",
            "appointments",
            200,
            data=appointment_data,
            token=self.adopter_token
        )
        
        return success

    def test_get_appointments(self):
        """Test getting appointments"""
        success, response = self.run_test(
            "Get Appointments",
            "GET",
            "appointments",
            200,
            token=self.adopter_token
        )
        
        return success and isinstance(response, list)

    def test_personality_matching_algorithm(self):
        """Test the personality matching algorithm with different scenarios"""
        print(f"\n🧠 Testing Personality Matching Algorithm...")
        
        # Test high compatibility (should match)
        high_compat_pet = {
            "name": "Compatible Pet",
            "breed": "Test Breed",
            "age": 2,
            "personality_traits": {
                "playful": 8,  # Close to adopter's 8
                "calm": 6,     # Same as adopter's 6
                "energetic": 7, # Same as adopter's 7
                "friendly": 9,  # Same as adopter's 9
                "independent": 5, # Same as adopter's 5
                "social": 8     # Same as adopter's 8
            },
            "images": []
        }
        
        success, pet_response = self.run_test(
            "Create High Compatibility Pet",
            "POST",
            "pets",
            200,
            data=high_compat_pet,
            token=self.foundation_token
        )
        
        if success:
            swipe_data = {
                "pet_id": pet_response['id'],
                "action": "like"
            }
            
            success, match_response = self.run_test(
                "Test High Compatibility Match",
                "POST",
                "matches/like",
                200,
                data=swipe_data,
                token=self.adopter_token
            )
            
            if success:
                score = match_response.get('match_score', 0)
                is_match = match_response.get('is_match', False)
                print(f"   High Compatibility Score: {score}%")
                print(f"   Expected Match (≥70%): {is_match}")
                
                if score >= 70 and is_match:
                    print("   ✅ High compatibility matching works correctly")
                else:
                    print("   ❌ High compatibility matching failed")
        
        # Test low compatibility (should not match)
        low_compat_pet = {
            "name": "Incompatible Pet",
            "breed": "Test Breed",
            "age": 2,
            "personality_traits": {
                "playful": 1,   # Very different from adopter's 8
                "calm": 10,     # Very different from adopter's 6
                "energetic": 1, # Very different from adopter's 7
                "friendly": 1,  # Very different from adopter's 9
                "independent": 10, # Very different from adopter's 5
                "social": 1     # Very different from adopter's 8
            },
            "images": []
        }
        
        success, pet_response = self.run_test(
            "Create Low Compatibility Pet",
            "POST",
            "pets",
            200,
            data=low_compat_pet,
            token=self.foundation_token
        )
        
        if success:
            swipe_data = {
                "pet_id": pet_response['id'],
                "action": "like"
            }
            
            success, match_response = self.run_test(
                "Test Low Compatibility Match",
                "POST",
                "matches/like",
                200,
                data=swipe_data,
                token=self.adopter_token
            )
            
            if success:
                score = match_response.get('match_score', 0)
                is_match = match_response.get('is_match', False)
                print(f"   Low Compatibility Score: {score}%")
                print(f"   Expected No Match (<70%): {not is_match}")
                
                if score < 70 and not is_match:
                    print("   ✅ Low compatibility matching works correctly")
                else:
                    print("   ❌ Low compatibility matching failed")

def main():
    print("🐾 Starting TinderPets API Testing...")
    tester = TinderPetsAPITester()
    
    # Test authentication
    if not tester.test_foundation_register():
        print("❌ Foundation registration failed, stopping tests")
        return 1
    
    if not tester.test_adopter_register():
        print("❌ Adopter registration failed, stopping tests")
        return 1
    
    if not tester.test_login():
        print("❌ Login failed")
    
    # Test pet management
    if not tester.test_create_pet():
        print("❌ Pet creation failed")
        return 1
    
    if not tester.test_get_foundation_pets():
        print("❌ Getting foundation pets failed")
    
    if not tester.test_get_available_pets():
        print("❌ Getting available pets failed")
    
    # Test matching system
    if not tester.test_swipe_like():
        print("❌ Swipe like failed")
    
    if not tester.test_get_matches():
        print("❌ Getting matches failed")
    
    tester.test_accept_match()  # May skip if no match
    tester.test_create_appointment()  # May skip if no match
    
    if not tester.test_get_appointments():
        print("❌ Getting appointments failed")
    
    # Test personality matching algorithm
    tester.test_personality_matching_algorithm()
    
    # Print results
    print(f"\n📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
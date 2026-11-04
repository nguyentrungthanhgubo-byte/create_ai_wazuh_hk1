import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()


class WazuhClient:
    def __init__(self):
        self.base_url = os.getenv(
            "WAZUH_API_URL",
            "https://127.0.0.1:55000"
        ).rstrip("/")

        self.username = os.getenv("WAZUH_API_USERNAME")
        self.password = os.getenv("WAZUH_API_PASSWORD")

        self.session = requests.Session()
        self.session.auth = HTTPBasicAuth(
            self.username,
            self.password
        )
        self.session.verify = os.getenv(
            "WAZUH_VERIFY_SSL", "false"
        ).lower() == "true"

    def get_token(self):
        response = self.session.post(
            f"{self.base_url}/security/user/authenticate"
        )
        response.raise_for_status()

        return response.json()["data"]["token"]

    def request(self, method, endpoint, params=None):
        token = self.get_token()

        headers = {
            "Authorization": f"Bearer {token}"
        }

        response = self.session.request(
            method=method,
            url=f"{self.base_url}{endpoint}",
            headers=headers,
            params=params,
            timeout=30
        )

        response.raise_for_status()
        return response.json()


wazuh_client = WazuhClient()

import os
from huggingface_hub import HfApi, login

print("=== AgriSense Hugging Face Deployment ===")
token = input("Enter your Hugging Face Access Token: ").strip()

print("\nLogging in...")
login(token=token, add_to_git_credential=True)

api = HfApi()
repo_id = "raghuldpr/Agrisense"

print(f"\nUploading the entire backend directory to {repo_id}...")
print("This may take a few minutes for the 97MB PyTorch model weight.")

folder_url = api.upload_folder(
    folder_path=".",
    repo_id=repo_id,
    repo_type="space",
    ignore_patterns=["venv/*", ".git/*", "__pycache__/*", ".env", "temp_uploads/*"]
)

print("\n✅ Upload complete!")
print(f"Your space is now building at: {folder_url}")
print("Don't forget to add your GROQ_API_KEY in the Space Settings -> Variables and secrets!")

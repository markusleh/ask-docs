
# To update the embeddings

1. Clone the Defender documentation repository

```bash
git clone https://github.com/MicrosoftDocs/defender-docs.git --depth 1
```

2. Install the required packages

```bash
pip install -r requirements.txt
```

3. Create a new Supabase project and configure it as described in the main [README](../README.md#initialization)

4. Set up the environment variables

```bash
export SUPABASE_URL=https://<your-supabase-project>.supabase.co
export SUPABASE_KEY=<your-supabase-key>
```

5. Run the script

```bash
python embed.py
```
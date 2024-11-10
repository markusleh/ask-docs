from langchain.vectorstores import SupabaseVectorStore
import pathlib
from langchain.embeddings import HuggingFaceEmbeddings, SentenceTransformerEmbeddings 
import frontmatter
import markdown # pip install markdown
from bs4 import BeautifulSoup # pip install beautifulsoup4
from unstructured.partition.md import partition_md
from langchain.docstore.document import Document
from sb import supabase

embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# For this prototype, we only use Defender for Endpoint documentation. This can be changed to any other product documentation.
DEFENDER_DOCS_DIR = "defender-docs/defender-endpoint"

def md_to_text(md):
    html = markdown.markdown(md)
    soup = BeautifulSoup(html, features='html.parser')
    return soup.get_text()

def filter_keys(d, keys):
    return {k: v for k, v in d.items() if k in keys}

def get_text(text_holder: list):
    text = "\n".join(text_holder)
    return md_to_text(text)

def get_md(path):
    docs = []
    metadata_keys = [
        "title",
        "description",
        "ms.date",
        "ms.prod",
    ]
    data = frontmatter.load(path)
    metadata = filter_keys(data.metadata, metadata_keys)
    rel_path = str(path).split("defender-docs/")[1]
    # remove trailing 'md' from path
    rel_path = rel_path[:-3]
    metadata["source"] = "https://learn.microsoft.com/en-us/" + rel_path
    metadata["product"] = "defender-endpoint"
    # loop through elements and start new Document objects for each title element
    text_holder = []
    docs = []
    new_metadata = metadata.copy()
    md_string = data.content
    # loop through md_string and start new Document objects for each markdown subtitle element (##)
    in_multiline_code = False
    for line in md_string.splitlines():
        if line.startswith("```"):
            in_multiline_code = not in_multiline_code
        if (line.startswith("## ") or line.startswith("# ")) and not in_multiline_code:
            if len(text_holder) > 0:
                new_metadata["subtitle"] = text_holder[0].replace("#", "").strip()
                if(new_metadata["subtitle"].lower() == "see also"):
                    continue
                new_metadata["original_text"] = "\n".join(text_holder)
                docs.append(Document(page_content=get_text(text_holder), metadata=new_metadata))
            text_holder = []
            new_metadata = metadata.copy()
            text_holder.append(line)
        else:
            text_holder.append(line)
    if len(text_holder) > 0:
        new_metadata["subtitle"] = text_holder[0].replace("#", "").strip()
        docs.append(Document(page_content=get_text(text_holder), metadata=new_metadata))

    return docs



db = SupabaseVectorStore(client=supabase, table_name="documents", query_name="match_documents", embedding=embeddings)

def save(docs):
    db.table_name = "documents"
    print(db.table_name)
    db.add_documents(docs, embedding_function=embeddings)

desktop = pathlib.Path(DEFENDER_DOCS_DIR)
file_list = list(desktop.rglob("*.md"))
docs = []
count = 0
print("Starting", len(file_list))
for file in file_list:
    count = count + 1
    docs = docs + get_md(file)
    if len(docs) > 10:
        # Save every 10 documents and print the count
        print(count)
        save(docs)
        docs = []
save(docs)
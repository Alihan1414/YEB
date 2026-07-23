import sys

path = r'src\app\page.js'
with open(path, encoding='utf-8') as f:
    content = f.read()

replacements = [
    ("[newParentEmail, setNewParentEmail, 'Veli E-posta']",
     "[newParentPhone, setNewParentPhone, 'Veli Telefonu (05xx...)']"),
    ("required={ph !== 'Veli E-posta'}",
     "required={ph !== 'Veli Telefonu (05xx...)'}"),
]

for old, new in replacements:
    count = content.count(old)
    content = content.replace(old, new)
    print(f"Replaced {count}x: {old[:40]}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

remaining = content.count('newParentEmail')
print(f"\nDone. Remaining 'newParentEmail' occurrences: {remaining}")

import os
import base64

kek = os.urandom(32)
print(base64.b64encode(kek).decode())
#!/usr/bin/env python3
import bcrypt

password = "Admin@123456"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
print(hashed.decode('utf-8'))

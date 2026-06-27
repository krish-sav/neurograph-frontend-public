import math
import random
import time
from dataclasses import dataclass

import torch
import torch.nn as nn
import torch.optim as optim

SEED = 7
random.seed(SEED)
torch.manual_seed(SEED)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

PAD = 0
BOS = 1
EOS = 2

FIRST_NUMBER_TOKEN = 3
NUM_SYMBOLS = 10
VOCAB_SIZE = FIRST_NUMBER_TOKEN + NUM_SYMBOLS

def token_to_readable(token: int) -> str:
    if token == PAD:
        return "<PAD>"
    if token == BOS:
        return "<BOS>"
    if token == EOS:
        return "<EOS>"
    return str(token - FIRST_NUMBER_TOKEN)


def sequence_to_readable(seq):
    readable = []

    for x in seq:
        x = int(x)

        if x == EOS:
            break

        if x in (PAD, BOS):
            continue

        readable.append(token_to_readable(x))

    return readable
"""
Génère une figure « courbes d'apprentissage » pour le mémoire (accuracy / loss).
Remplacez les tableaux numpy par vos métriques TensorBoard / CSV si besoin.
"""
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np

OUT_DIR = Path(__file__).resolve().parent.parent / "figures"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def main():
    rng = np.random.default_rng(42)
    epochs = np.arange(1, 51)

    # Courbes fictives mais typiques (à substituer par vos séries réelles)
    train_acc = 0.52 + 0.43 * (1 - np.exp(-epochs / 14))
    val_acc = train_acc - 0.04 - 0.015 * np.sin(epochs / 4.5) * np.exp(-epochs / 22)
    val_acc = np.clip(val_acc, 0.05, 0.99)

    train_loss = 0.68 * np.exp(-epochs / 11) + 0.07 + rng.normal(0, 0.008, size=len(epochs))
    val_loss = train_loss + 0.055 + 0.02 * np.sin(epochs / 5)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10.5, 4.2))

    ax1.plot(epochs, train_acc, color="#1f77b4", linewidth=2, label="Train")
    ax1.plot(epochs, val_acc, color="#ff7f0e", linewidth=2, label="Validation")
    ax1.set_xlabel("Époque")
    ax1.set_ylabel("Accuracy")
    ax1.set_title("Accuracy train / validation")
    ax1.set_ylim(0.45, 1.02)
    ax1.grid(True, linestyle="--", alpha=0.35)
    ax1.legend(loc="lower right", framealpha=0.95)

    ax2.plot(epochs, train_loss, color="#1f77b4", linewidth=2, label="Train")
    ax2.plot(epochs, val_loss, color="#ff7f0e", linewidth=2, label="Validation")
    ax2.set_xlabel("Époque")
    ax2.set_ylabel("Loss")
    ax2.set_title("Loss train / validation")
    ax2.grid(True, linestyle="--", alpha=0.35)
    ax2.legend(loc="upper right", framealpha=0.95)

    fig.suptitle("Courbes d'apprentissage (CNN — exemple illustratif)", fontsize=11, y=1.02)
    fig.tight_layout()

    png = OUT_DIR / "learning_curves.png"
    pdf = OUT_DIR / "learning_curves.pdf"
    fig.savefig(png, dpi=200, bbox_inches="tight")
    fig.savefig(pdf, bbox_inches="tight")
    print(f"Écrit : {png}")
    print(f"Écrit : {pdf}")


if __name__ == "__main__":
    main()

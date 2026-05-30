import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Configuration
fig, ax = plt.subplots(1, 1, figsize=(12, 6))  # A4 largeur ~12 pouces
ax.set_xlim(0, 12)
ax.set_ylim(0, 6)
ax.set_facecolor('white')
ax.axis('off')

# Couleurs
EDGE_COLOR = "#1E5AA8"
CLOUD_COLOR = "#8BB3D4"  # nuance plus claire
LINE_COLOR = "#1E5AA8"

# ================================================================
# Bloc EDGE (gauche) - véhicule stylisé
# ================================================================

# Contour principal du véhicule (vue de dessus stylisée)
car_body = FancyBboxPatch((0.8, 1.8), 3.8, 2.4,
                           boxstyle="round,pad=0.1",
                           facecolor=EDGE_COLOR,
                           edgecolor=EDGE_COLOR,
                           linewidth=2,
                           alpha=0.15)
ax.add_patch(car_body)

# Coffre / capot avant (forme arrondie)
capot = FancyBboxPatch((0.9, 2.0), 1.5, 2.0,
                        boxstyle="round,pad=0.05",
                        facecolor=EDGE_COLOR,
                        edgecolor=EDGE_COLOR,
                        linewidth=1.5,
                        alpha=0.4)
ax.add_patch(capot)

# Habitacle (partie centrale)
habitacle = FancyBboxPatch((2.4, 2.0), 1.5, 2.0,
                            boxstyle="round,pad=0.05",
                            facecolor=EDGE_COLOR,
                            edgecolor=EDGE_COLOR,
                            linewidth=1.5,
                            alpha=0.6)
ax.add_patch(habitacle)

# Toit (ligne supérieure)
toit = mlines.Line2D([2.5, 3.8], [4.0, 4.0], color=EDGE_COLOR, linewidth=2)
ax.add_line(toit)

# Roues stylisées (cercles)
roue_gauche = plt.Circle((1.2, 1.6), 0.35, facecolor=EDGE_COLOR, edgecolor=EDGE_COLOR, linewidth=1.5, alpha=0.7)
roue_droite = plt.Circle((4.0, 1.6), 0.35, facecolor=EDGE_COLOR, edgecolor=EDGE_COLOR, linewidth=1.5, alpha=0.7)
ax.add_patch(roue_gauche)
ax.add_patch(roue_droite)

# Petit élément rectangulaire style "Edge device" (module embarqué)
edge_module = FancyBboxPatch((1.8, 2.4), 1.0, 1.2,
                              boxstyle="round,pad=0.05",
                              facecolor=EDGE_COLOR,
                              edgecolor=EDGE_COLOR,
                              linewidth=1.8,
                              alpha=0.9)
ax.add_patch(edge_module)

# Antenne (ligne verticale)
antenne = mlines.Line2D([4.0, 4.0], [4.0, 4.6], color=EDGE_COLOR, linewidth=1.5)
ax.add_line(antenne)
antenne_top = plt.Circle((4.0, 4.65), 0.08, facecolor=EDGE_COLOR, edgecolor=EDGE_COLOR)
ax.add_patch(antenne_top)

# ================================================================
# Bloc CLOUD (droite) - nuage stylisé
# ================================================================

# Nuage principal (cercles superposés)
cloud_center_x = 8.5
cloud_center_y = 3.0

# Cercle principal
cloud_main = plt.Circle((cloud_center_x, cloud_center_y), 1.2,
                         facecolor=CLOUD_COLOR,
                         edgecolor=EDGE_COLOR,
                         linewidth=2,
                         alpha=0.8)
ax.add_patch(cloud_main)

# Cercles satellites
cloud_left = plt.Circle((cloud_center_x - 1.0, cloud_center_y - 0.2), 0.8,
                         facecolor=CLOUD_COLOR,
                         edgecolor=EDGE_COLOR,
                         linewidth=2,
                         alpha=0.7)
ax.add_patch(cloud_left)

cloud_right = plt.Circle((cloud_center_x + 1.0, cloud_center_y - 0.2), 0.8,
                          facecolor=CLOUD_COLOR,
                          edgecolor=EDGE_COLOR,
                          linewidth=2,
                          alpha=0.7)
ax.add_patch(cloud_right)

cloud_top = plt.Circle((cloud_center_x, cloud_center_y + 0.8), 0.9,
                        facecolor=CLOUD_COLOR,
                        edgecolor=EDGE_COLOR,
                        linewidth=2,
                        alpha=0.9)
ax.add_patch(cloud_top)

cloud_bottom = plt.Circle((cloud_center_x, cloud_center_y - 0.5), 0.7,
                           facecolor=CLOUD_COLOR,
                           edgecolor=EDGE_COLOR,
                           linewidth=2,
                           alpha=0.6)
ax.add_patch(cloud_bottom)

# Légère ligne de base pour stabiliser visuellement
cloud_base = mlines.Line2D([cloud_center_x - 1.8, cloud_center_x + 1.8],
                            [cloud_center_y - 1.2, cloud_center_y - 1.2],
                            color=EDGE_COLOR, linewidth=0.8, alpha=0.5)
ax.add_line(cloud_base)

# ================================================================
# FLÈCHES BIDIRECTIONNELLES (connexion Edge ↔ Cloud)
# ================================================================

# Flèche vers le haut (Edge → Cloud)
arrow_up = FancyArrowPatch((5.2, 3.8), (6.8, 4.0),
                            arrowstyle='->,head_width=0.2,head_length=0.2',
                            color=EDGE_COLOR,
                            linewidth=1.8,
                            alpha=0.8)
ax.add_patch(arrow_up)

# Flèche vers le bas (Cloud → Edge)
arrow_down = FancyArrowPatch((5.2, 2.6), (6.8, 2.4),
                              arrowstyle='->,head_width=0.2,head_length=0.2',
                              color=EDGE_COLOR,
                              linewidth=1.8,
                              alpha=0.8)
ax.add_patch(arrow_down)

# Ligne centrale reliant les deux flèches (optionnel, pour renforcer la bidirectionnalité)
center_line = mlines.Line2D([5.2, 6.8], [3.2, 3.2], color=EDGE_COLOR, linewidth=1.2, alpha=0.4)
ax.add_line(center_line)

# ================================================================
# SÉPARATION VERTICALE (zone locale / zone distante)
# ================================================================

# Ligne de séparation verticale (discrète)
sep_line = mlines.Line2D([5.0, 5.0], [0.8, 5.2], color=EDGE_COLOR, linewidth=1.2, alpha=0.5, linestyle='--')
ax.add_line(sep_line)

# Petite pastille pour indiquer la distinction (optionnelle)
sep_dot_top = plt.Circle((4.95, 5.3), 0.05, facecolor=EDGE_COLOR, alpha=0.6)
sep_dot_bottom = plt.Circle((4.95, 0.7), 0.05, facecolor=EDGE_COLOR, alpha=0.6)
ax.add_patch(sep_dot_top)
ax.add_patch(sep_dot_bottom)

# ================================================================
# FINALISATION
# ================================================================

plt.tight_layout(pad=0)

# Sauvegarde en haute résolution (vectoriel via SVG + PNG)
plt.savefig('edge_cloud_architecture.png', dpi=300, bbox_inches='tight', facecolor='white')
plt.savefig('edge_cloud_architecture.svg', bbox_inches='tight', facecolor='white')

plt.show()

print("✅ Illustration générée : edge_cloud_architecture.png / .svg")
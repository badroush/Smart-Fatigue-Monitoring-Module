<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260318170342 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TABLE administrateur (position VARCHAR(100) DEFAULT NULL, managed_modules JSON NOT NULL, can_configure_thresholds TINYINT NOT NULL, can_manage_users TINYINT NOT NULL, can_export_reports TINYINT NOT NULL, last_configuration_change DATETIME DEFAULT NULL, id INT NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE alerte (id BINARY(16) NOT NULL, id_alerte VARCHAR(50) NOT NULL, niveau VARCHAR(255) NOT NULL, message VARCHAR(255) NOT NULL, type VARCHAR(50) NOT NULL, statut VARCHAR(50) NOT NULL, horodatage DATETIME NOT NULL, acquittee_at DATETIME DEFAULT NULL, resolue_at DATETIME DEFAULT NULL, metadata JSON DEFAULT NULL, envoyee TINYINT DEFAULT 0 NOT NULL, lue TINYINT DEFAULT 0 NOT NULL, conducteur_id BINARY(16) NOT NULL, vehicule_id BINARY(16) NOT NULL, acquittee_par_id INT DEFAULT NULL, resolue_par_id INT DEFAULT NULL, fatigue_event_id BINARY(16) DEFAULT NULL, UNIQUE INDEX UNIQ_3AE753A2599C0D7 (id_alerte), INDEX IDX_3AE753AF16F4AC6 (conducteur_id), INDEX IDX_3AE753A4A4A3511 (vehicule_id), INDEX IDX_3AE753A50EC6314 (acquittee_par_id), INDEX IDX_3AE753A92A12474 (resolue_par_id), INDEX IDX_3AE753A5A44D092 (fatigue_event_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE analyse_fatigue (id BINARY(16) NOT NULL, yeux_fermes TINYINT NOT NULL, ear DOUBLE PRECISION NOT NULL, baillements TINYINT NOT NULL, mar DOUBLE PRECISION NOT NULL, inclinaison_tete TINYINT NOT NULL, pitch DOUBLE PRECISION NOT NULL, yaw DOUBLE PRECISION NOT NULL, nombre_clignements INT NOT NULL, duree_yeux_fermes INT NOT NULL, nombre_baillements INT NOT NULL, niveau_vigilance VARCHAR(255) NOT NULL, horodatage DATETIME NOT NULL, alerte_yeux_fermes TINYINT DEFAULT 0 NOT NULL, alerte_baillements TINYINT DEFAULT 0 NOT NULL, alerte_inclinaison_tete TINYINT DEFAULT 0 NOT NULL, metadata JSON DEFAULT NULL, score_fatigue INT DEFAULT 0 NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE conducteur (id BINARY(16) NOT NULL, nom VARCHAR(100) NOT NULL, numero_permis VARCHAR(50) NOT NULL, telephone VARCHAR(20) DEFAULT NULL, date_naissance DATE DEFAULT NULL, adresse VARCHAR(100) DEFAULT NULL, is_active TINYINT NOT NULL, total_alertes INT DEFAULT 0 NOT NULL, total_evenements_fatigue INT DEFAULT 0 NOT NULL, created_at DATETIME NOT NULL, last_fatigue_event_at DATETIME DEFAULT NULL, vehicule_assigne_id BINARY(16) DEFAULT NULL, UNIQUE INDEX UNIQ_236771434FFF8769 (numero_permis), INDEX IDX_23677143D264101F (vehicule_assigne_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE donnees_capteurs (id BINARY(16) NOT NULL, temperature_ambiante DOUBLE PRECISION NOT NULL, humidite DOUBLE PRECISION NOT NULL, luminosite INT NOT NULL, temperature_corporelle DOUBLE PRECISION NOT NULL, duree_conduite INT NOT NULL, horodatage DATETIME NOT NULL, alerte_temperature TINYINT DEFAULT 0 NOT NULL, alerte_humidite TINYINT DEFAULT 0 NOT NULL, alerte_luminosite TINYINT DEFAULT 0 NOT NULL, alerte_temperature_corporelle TINYINT DEFAULT 0 NOT NULL, metadata JSON DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE fatigue_event (id BINARY(16) NOT NULL, id_evenement VARCHAR(50) NOT NULL, niveau_max VARCHAR(255) NOT NULL, duree_secondes INT NOT NULL, interventions_declenchees JSON NOT NULL, debut DATETIME NOT NULL, fin DATETIME DEFAULT NULL, resolu TINYINT DEFAULT 0 NOT NULL, resolu_at DATETIME DEFAULT NULL, notes VARCHAR(500) DEFAULT NULL, metadata JSON DEFAULT NULL, conducteur_id BINARY(16) NOT NULL, vehicule_id BINARY(16) NOT NULL, localisation_debut_id BINARY(16) DEFAULT NULL, localisation_fin_id BINARY(16) DEFAULT NULL, resolu_par_id INT DEFAULT NULL, UNIQUE INDEX UNIQ_74F43AEE8B13D439 (id_evenement), INDEX IDX_74F43AEEF16F4AC6 (conducteur_id), INDEX IDX_74F43AEE4A4A3511 (vehicule_id), INDEX IDX_74F43AEE68E99FEE (localisation_debut_id), INDEX IDX_74F43AEE9E7F9DD3 (localisation_fin_id), INDEX IDX_74F43AEE5E3DAC49 (resolu_par_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE localisation_gps (id BINARY(16) NOT NULL, latitude DOUBLE PRECISION NOT NULL, longitude DOUBLE PRECISION NOT NULL, altitude DOUBLE PRECISION DEFAULT NULL, `precision` DOUBLE PRECISION DEFAULT NULL, horodatage DATETIME NOT NULL, adresse VARCHAR(50) DEFAULT NULL, pays VARCHAR(10) DEFAULT NULL, ville VARCHAR(50) DEFAULT NULL, code_postal VARCHAR(100) DEFAULT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE paquet_donnees (id BINARY(16) NOT NULL, id_conducteur VARCHAR(36) NOT NULL, id_vehicule VARCHAR(36) NOT NULL, id_sfam VARCHAR(100) NOT NULL, niveau_vigilance VARCHAR(255) NOT NULL, horodatage DATETIME NOT NULL, received_at DATETIME DEFAULT NULL, metadata JSON DEFAULT NULL, traite TINYINT DEFAULT 0 NOT NULL, alerte_generee TINYINT DEFAULT 0 NOT NULL, donnees_capteurs_id BINARY(16) NOT NULL, analyse_fatigue_id BINARY(16) NOT NULL, localisation_gps_id BINARY(16) NOT NULL, conducteur_id BINARY(16) DEFAULT NULL, vehicule_id BINARY(16) DEFAULT NULL, fatigue_event_id BINARY(16) DEFAULT NULL, UNIQUE INDEX UNIQ_2A966C3E9C1FB521 (donnees_capteurs_id), UNIQUE INDEX UNIQ_2A966C3EC5FFBC02 (analyse_fatigue_id), UNIQUE INDEX UNIQ_2A966C3E9AA034C7 (localisation_gps_id), INDEX IDX_2A966C3EF16F4AC6 (conducteur_id), INDEX IDX_2A966C3E4A4A3511 (vehicule_id), INDEX IDX_2A966C3E5A44D092 (fatigue_event_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE responsable_supervision (phone_number VARCHAR(50) DEFAULT NULL, department VARCHAR(100) DEFAULT NULL, receives_critical_alerts TINYINT NOT NULL, receives_sms_notifications TINYINT NOT NULL, notification_email VARCHAR(255) DEFAULT NULL, id INT NOT NULL, PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE user (id INT AUTO_INCREMENT NOT NULL, email VARCHAR(180) NOT NULL, roles JSON NOT NULL, password VARCHAR(255) NOT NULL, full_name VARCHAR(100) NOT NULL, is_verified TINYINT NOT NULL, is_active TINYINT NOT NULL, created_at DATETIME NOT NULL, last_login_at DATETIME DEFAULT NULL, type VARCHAR(255) NOT NULL, UNIQUE INDEX UNIQ_8D93D649E7927C74 (email), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('CREATE TABLE vehicule (id BINARY(16) NOT NULL, immatriculation VARCHAR(20) NOT NULL, type VARCHAR(50) NOT NULL, marque VARCHAR(100) DEFAULT NULL, modele VARCHAR(100) DEFAULT NULL, annee_fabrication INT DEFAULT NULL, statut VARCHAR(50) NOT NULL, kilometrage INT DEFAULT NULL, couleur VARCHAR(100) DEFAULT NULL, numero_chassis VARCHAR(50) DEFAULT NULL, numero_moteur VARCHAR(50) DEFAULT NULL, is_active TINYINT NOT NULL, is_monitored TINYINT NOT NULL, sfam_api_key VARCHAR(100) NOT NULL, derniere_communication DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, last_maintenance_at DATETIME DEFAULT NULL, next_maintenance_at DATETIME DEFAULT NULL, localisation_actuelle_id BINARY(16) DEFAULT NULL, UNIQUE INDEX UNIQ_292FFF1DBE73422E (immatriculation), UNIQUE INDEX UNIQ_292FFF1DDB111324 (sfam_api_key), UNIQUE INDEX UNIQ_292FFF1D7ABA1969 (localisation_actuelle_id), PRIMARY KEY (id)) DEFAULT CHARACTER SET utf8mb4');
        $this->addSql('ALTER TABLE administrateur ADD CONSTRAINT FK_32EB52E8BF396750 FOREIGN KEY (id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753AF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A50EC6314 FOREIGN KEY (acquittee_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A92A12474 FOREIGN KEY (resolue_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE alerte ADD CONSTRAINT FK_3AE753A5A44D092 FOREIGN KEY (fatigue_event_id) REFERENCES fatigue_event (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE conducteur ADD CONSTRAINT FK_23677143D264101F FOREIGN KEY (vehicule_assigne_id) REFERENCES vehicule (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEEF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE68E99FEE FOREIGN KEY (localisation_debut_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE9E7F9DD3 FOREIGN KEY (localisation_fin_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE fatigue_event ADD CONSTRAINT FK_74F43AEE5E3DAC49 FOREIGN KEY (resolu_par_id) REFERENCES user (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E9C1FB521 FOREIGN KEY (donnees_capteurs_id) REFERENCES donnees_capteurs (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3EC5FFBC02 FOREIGN KEY (analyse_fatigue_id) REFERENCES analyse_fatigue (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E9AA034C7 FOREIGN KEY (localisation_gps_id) REFERENCES localisation_gps (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3EF16F4AC6 FOREIGN KEY (conducteur_id) REFERENCES conducteur (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E4A4A3511 FOREIGN KEY (vehicule_id) REFERENCES vehicule (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE paquet_donnees ADD CONSTRAINT FK_2A966C3E5A44D092 FOREIGN KEY (fatigue_event_id) REFERENCES fatigue_event (id) ON DELETE SET NULL');
        $this->addSql('ALTER TABLE responsable_supervision ADD CONSTRAINT FK_30367133BF396750 FOREIGN KEY (id) REFERENCES user (id) ON DELETE CASCADE');
        $this->addSql('ALTER TABLE vehicule ADD CONSTRAINT FK_292FFF1D7ABA1969 FOREIGN KEY (localisation_actuelle_id) REFERENCES localisation_gps (id) ON DELETE SET NULL');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('ALTER TABLE administrateur DROP FOREIGN KEY FK_32EB52E8BF396750');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753AF16F4AC6');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A4A4A3511');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A50EC6314');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A92A12474');
        $this->addSql('ALTER TABLE alerte DROP FOREIGN KEY FK_3AE753A5A44D092');
        $this->addSql('ALTER TABLE conducteur DROP FOREIGN KEY FK_23677143D264101F');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEEF16F4AC6');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE4A4A3511');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE68E99FEE');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE9E7F9DD3');
        $this->addSql('ALTER TABLE fatigue_event DROP FOREIGN KEY FK_74F43AEE5E3DAC49');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E9C1FB521');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3EC5FFBC02');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E9AA034C7');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3EF16F4AC6');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E4A4A3511');
        $this->addSql('ALTER TABLE paquet_donnees DROP FOREIGN KEY FK_2A966C3E5A44D092');
        $this->addSql('ALTER TABLE responsable_supervision DROP FOREIGN KEY FK_30367133BF396750');
        $this->addSql('ALTER TABLE vehicule DROP FOREIGN KEY FK_292FFF1D7ABA1969');
        $this->addSql('DROP TABLE administrateur');
        $this->addSql('DROP TABLE alerte');
        $this->addSql('DROP TABLE analyse_fatigue');
        $this->addSql('DROP TABLE conducteur');
        $this->addSql('DROP TABLE donnees_capteurs');
        $this->addSql('DROP TABLE fatigue_event');
        $this->addSql('DROP TABLE localisation_gps');
        $this->addSql('DROP TABLE paquet_donnees');
        $this->addSql('DROP TABLE responsable_supervision');
        $this->addSql('DROP TABLE user');
        $this->addSql('DROP TABLE vehicule');
    }
}

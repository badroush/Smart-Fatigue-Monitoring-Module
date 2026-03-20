<?php

namespace App\Tests\Enum;

use App\Enum\NiveauVigilance;
use PHPUnit\Framework\TestCase;

class NiveauVigilanceTest extends TestCase
{
    public function testGetLabel(): void
    {
        $this->assertEquals('Normal', NiveauVigilance::NORMAL->getLabel());
        $this->assertEquals('Somnolence critique', NiveauVigilance::SOMNOLENCE_CRITIQUE->getLabel());
    }

    public function testGetColor(): void
    {
        $this->assertEquals('success', NiveauVigilance::NORMAL->getColor());
        $this->assertEquals('danger', NiveauVigilance::SOMNOLENCE_CRITIQUE->getColor());
    }

    public function testRequiresIntervention(): void
    {
        $this->assertFalse(NiveauVigilance::NORMAL->requiresIntervention());
        $this->assertTrue(NiveauVigilance::FATIGUE_MODEREE->requiresIntervention());
        $this->assertTrue(NiveauVigilance::SOMNOLENCE_CRITIQUE->requiresIntervention());
    }

    public function testIsCritical(): void
    {
        $this->assertFalse(NiveauVigilance::FATIGUE_SEVERE->isCritical());
        $this->assertTrue(NiveauVigilance::SOMNOLENCE_CRITIQUE->isCritical());
    }

    public function testGetThreshold(): void
    {
        $this->assertEquals(0, NiveauVigilance::NORMAL->getThreshold());
        $this->assertEquals(4, NiveauVigilance::SOMNOLENCE_CRITIQUE->getThreshold());
    }

    public function testIsHigherThan(): void
    {
        $this->assertTrue(NiveauVigilance::SOMNOLENCE_CRITIQUE->isHigherThan(NiveauVigilance::NORMAL));
        $this->assertFalse(NiveauVigilance::NORMAL->isHigherThan(NiveauVigilance::SOMNOLENCE_CRITIQUE));
    }

    public function testFromString(): void
    {
        $this->assertEquals(NiveauVigilance::NORMAL, NiveauVigilance::fromString('normal'));
        $this->assertEquals(NiveauVigilance::SOMNOLENCE_CRITIQUE, NiveauVigilance::fromString('SOMNOLENCE_CRITIQUE'));
        $this->assertNull(NiveauVigilance::fromString('INVALID'));
    }

    public function testIsValid(): void
    {
        $this->assertTrue(NiveauVigilance::isValid('NORMAL'));
        $this->assertFalse(NiveauVigilance::isValid('INVALID'));
    }

    public function testToJson(): void
    {
        $json = NiveauVigilance::SOMNOLENCE_CRITIQUE->toJson();
        $this->assertEquals('SOMNOLENCE_CRITIQUE', $json['value']);
        $this->assertEquals('Somnolence critique', $json['label']);
        $this->assertEquals('danger', $json['color']);
        $this->assertTrue($json['critical']);
    }
}
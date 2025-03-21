import p5 from "p5";
// import qrCodeImg from "./cropped_qr_whaling_dev.png";

// Parameter definitions moved from main.tsx to here
export const numericParameterDefs = {
  "timeMultiplier": {
    "min": 0,
    "max": 0.01,
    "step": 0.00001,
    "defaultValue": 0.0003, // Set to match initial value
  },
  "noiseSize": {
    "min": 0,
    "max": 100,
    "step": 1,
    "defaultValue": 80,
  },
  "noiseScale": {
    "min": 0,
    "max": 0.1,
    "step": 0.0001,
    "defaultValue": 0.0026,
  },
  "noiseDetailOctave": {
    "min": 0,
    "max": 10,
    "step": 1,
    "defaultValue": 3,
  },
  "noiseDetailFalloff": {
    "min": 0,
    "max": 1,
    "step": 0.05,
    "defaultValue": 0.7,
  },
  "particleFrequency": {
    "min": 0,
    "max": 360,
    "step": 4,
    "defaultValue": 10, // Set to match initial value
  },
  "gridTransparency": {
    "min": 0,
    "max": 255,
    "step": 1,
    "defaultValue": 24,
  },
  "trailTransparency": {
    "min": 0,
    "max": 255,
    "step": 1,
    "defaultValue": 1,
  },
  "gridSize": {
    "min": 10,
    "max": 50,
    "step": 1,
    "defaultValue": 25,
  },
  // New parameters for particle behavior
  "particleMaxCount": {
    "min": 50,
    "max": 1000, 
    "step": 10,
    "defaultValue": 1000,
  },
  "particleForceStrength": {
    "min": 0.01,
    "max": 0.5,
    "step": 0.01,
    "defaultValue": 0.1,
  },
  "particleMaxSpeed": {
    "min": 0.5,
    "max": 5,
    "step": 0.1,
    "defaultValue": 2.4,
  },
  "particleTrailWeight": {
    "min": 1,
    "max": 5,
    "step": 0.5,
    "defaultValue": 1,
  },
};

// This type represents the parameter store structure
export type ParameterStore = {
  [K in keyof typeof numericParameterDefs]: number;
};

// Create initialization function here too
export function initParameterStore(): ParameterStore {
  // Initialize from default values in the parameter definitions
  const store = {} as ParameterStore;
  
  Object.entries(numericParameterDefs).forEach(([key, def]) => {
    store[key as keyof ParameterStore] = def.defaultValue;
  });
  
  return store;
}

// This function creates the p5 sketch
export function createSketch(parameterStore: ParameterStore) {
  return function sketch(p: p5) {
    let font: p5.Font;
    let qrImage: p5.Image;
    // Create a separate graphics layer for particles
    let particleLayer: p5.Graphics;
    let gridLayer: p5.Graphics;
    let particleMask: p5.Graphics;
    let qrData: boolean[] = [];
    let canvasSize: number;
    
    // Improved particle structure with vectors and previous position
    interface SimpleParticle {
      pos: p5.Vector;
      vel: p5.Vector;
      acc: p5.Vector;
      prevPos: p5.Vector;
    }
    
    // Array to store particles
    let particles: SimpleParticle[] = [];
    
    p.preload = function() {
      // can preload assets here...
        qrImage = p.loadImage("./cropped_qr_4.png");
      // qrImage = p.loadImage(qrCodeImg);

      // get the width and height of the image
      console.log("loaded image, width:", qrImage.width, "height:", qrImage.height);
      font = p.loadFont(
        new URL("/public/fonts/inconsolata.otf", import.meta.url).href
      );
    };
    
    p.setup = function() {
      // Determine the canvas size based on screen width
      canvasSize = Math.min(500, window.innerWidth - 20); // 20px buffer
      
      p.createCanvas(canvasSize, canvasSize, p.WEBGL);
      // Create particle layer with same dimensions and renderer
      particleLayer = p.createGraphics(canvasSize, canvasSize, p.WEBGL);
      particleLayer.setAttributes({ alpha: true });
      particleMask = p.createGraphics(canvasSize, canvasSize, p.WEBGL);
      particleMask.setAttributes({ alpha: true });
      particleMask.fill("#FFFFFFDD");
      particleMask.rect(0, 0, canvasSize, canvasSize);
      gridLayer = p.createGraphics(canvasSize, canvasSize, p.WEBGL);      

      console.log("scanning image, width:", qrImage.width, "height:", qrImage.height, "density:", (qrImage as any).pixelDensity());
      let qrWidth = qrImage.width;
      let qrHeight = qrImage.height;
      let qrRowCount = 25;
      let qrColCount = 25;
      let qrRowWidth = 9;
      let qrRowHeight = 9;
      let qrOffset = 4;
      console.log("qrRowWidth:", qrRowWidth, "qrRowHeight:", qrRowHeight);
      for (let i = 0; i <= qrRowCount; i++) {
        for (let j = 0; j <= qrColCount; j++) {
          let qrOffsetX = i * qrRowWidth + qrOffset;
          let qrOffsetY = j * qrRowHeight + qrOffset;
          let qrValue = qrImage.get(qrOffsetX, qrOffsetY);
          let logicalValue = qrValue[0] < 128;
          qrData[25 * i + j] = logicalValue;
          console.log("qrValue:", i, j, qrOffsetX, qrOffsetY, qrValue, logicalValue);

        }
      }

      // p.background("#FFF8E6");
      // ...
    };
    
    // Handle window resizing
    p.windowResized = function() {
      // Update canvas size when window is resized
      const newSize = Math.min(500, window.innerWidth - 20);
      
      // Only resize if the size actually changed
      if (newSize !== canvasSize) {
        canvasSize = newSize;
        p.resizeCanvas(canvasSize, canvasSize);
        
        // Recreate the layers with new size
        particleLayer = p.createGraphics(canvasSize, canvasSize, p.WEBGL);
        particleLayer.setAttributes({ alpha: true });
        particleMask = p.createGraphics(canvasSize, canvasSize, p.WEBGL);
        particleMask.setAttributes({ alpha: true });
        particleMask.fill("#FFFFFFDD");
        particleMask.rect(0, 0, canvasSize, canvasSize);
        gridLayer = p.createGraphics(canvasSize, canvasSize, p.WEBGL);
        
        // Reset particles for the new canvas size
        particles = [];
      }
    };
    
    // Create a new particle with vector properties
    function createParticle(x: number, y: number): SimpleParticle {
      const pos = p.createVector(x, y);
      return {
        pos: pos,
        vel: p.createVector(0, 0),
        acc: p.createVector(0, 0),
        prevPos: pos.copy()
      };
    }
    
    // Update particle physics
    function updateParticle(particle: SimpleParticle, flowAngle: number, updateVelocity: boolean = true): void {
      // Save previous position for drawing
      particle.prevPos.set(particle.pos);
      
      // Create a force vector from the flow field angle
      const force = p5.Vector.fromAngle(flowAngle);
      force.mult(parameterStore.particleForceStrength); // Force magnitude from parameters
      
      if (updateVelocity) {
        // Apply force to acceleration
        particle.acc.add(force);
        
        // Update velocity with acceleration
        particle.vel.add(particle.acc);
      
        // Limit velocity to prevent excessive speed - use parameter
        particle.vel.limit(parameterStore.particleMaxSpeed);
      }
      
      // Update position with velocity
      particle.pos.add(particle.vel);
      
      // Reset acceleration for next frame
      particle.acc.mult(0);
      
      // Handle edges by wrapping around
      if (particle.pos.x < -p.width/2) {
        particle.pos.x = p.width/2;
        particle.prevPos.x = p.width/2;
      }
      if (particle.pos.x > p.width/2) {
        particle.pos.x = -p.width/2;
        particle.prevPos.x = -p.width/2;
      }
      if (particle.pos.y < -p.height/2) {
        particle.pos.y = p.height/2;
        particle.prevPos.y = p.height/2;
      }
      if (particle.pos.y > p.height/2) {
        particle.pos.y = -p.height/2;
        particle.prevPos.y = -p.height/2;
      }
    }
    
    p.draw = function() {
      let timeMultiplier = parameterStore.timeMultiplier;
      let noiseSize = parameterStore.noiseSize;
      let noiseScale = parameterStore.noiseScale;
      let falloff = parameterStore.noiseDetailFalloff;
      let octaves = parameterStore.noiseDetailOctave;
      let particleFrequency = parameterStore.particleFrequency;
      let gridSize = parameterStore.gridSize;
      let gridTransparency = parameterStore.gridTransparency;
   
      // p.clear();

      // Set noise detail for both canvases
      p.noiseDetail(octaves, falloff);
      gridLayer.noiseDetail(octaves, falloff);
      particleLayer.noiseDetail(octaves, falloff);

      // Clear the particle layer each frame with transparent background
      // particleLayer.clear();

      // Instead of clearing, draw a semi-transparent black rectangle
      // that partially obscures previous frames
      gridLayer.push();
      gridLayer.translate(-p.width/2, -p.height/2); // Move to top-left in WEBGL mode
      
      // Convert blurAmount to hex and use it for the alpha value
      let alphaHex = Math.floor(gridTransparency).toString(16).padStart(2, '0');
      gridLayer.fill(`#F2EFE7${alphaHex}`); // 
      
      gridLayer.noStroke();
      gridLayer.rect(0, 0, p.width, p.height);
      gridLayer.pop();
      
      // get the current time
      let time = p.millis() * timeMultiplier;
      
      // Calculate dimensions and offsets for WEBGL coordinate system
      let insetCells = 2;
      let totalWidth = p.width;
      let totalHeight = p.height;

      let cellWidth = totalWidth / ((25 + (insetCells * 2)));
      let cellHeight = totalHeight / ((25 + (insetCells * 2)));

      let startX = -p.width / 2 + (cellWidth * insetCells);
      let startY = -p.height / 2 + (cellHeight * insetCells);
      let endX = p.width / 2 - (cellWidth * insetCells + 1);
      let endY = p.height / 2 - (cellHeight * insetCells + 1);
      // let startX = -totalWidth/2 * (1 - insetPercentage);
      // let startY = -totalHeight/2 * (1 - insetPercentage);

      // const startX = -p.width/2 * (1 - insetPercentage);
      // const startY = -p.height/2 * (1 - insetPercentage);
      // const endX = p.width/2 * (1 - insetPercentage);
      // const endY = p.height/2 * (1 - insetPercentage);
      const noiseOffsetX = p.width/2;  // Offset for consistent noise sampling
      const noiseOffsetY = p.height/2;
      
      
      // Instead of iterating over canvas dimensions, use grid indices from 0 to 24
      for (let i = 0; i <= 24; i++) {
        for (let j = 0; j <= 24; j++) {
          // Map grid indices to canvas positions with inset
          // const x = p.map(i, 0, 24, startX, endX);
          // const y = p.map(j, 0, 24, startY, endY);

          const x = -p.width / 2 + (i + insetCells) * cellWidth;
          const y = (j + insetCells) * cellHeight - p.height/2;
          
          let angle = p.noise((x + noiseOffsetX) * noiseScale, (y + noiseOffsetY) * noiseScale, time);
          let angleRadians = 2 * angle * Math.PI * 2;
          
          // Calculate vector endpoint

          // look up the cell in the qrData array
          let cellValue = qrData[25 * i + j];
          // console.log("cellValue:", i, j, cellValue);

          if (cellValue) {
            gridLayer.noStroke();
            gridLayer.fill("#446430");
            // Size of each grid cell
            gridLayer.rect(x, y, cellWidth, cellHeight);

            gridLayer.stroke("#446430");
            gridLayer.strokeWeight(1);
            
            // Draw the line
            let x1 = x + (cellWidth * 0.5)
            let y1 = y + (cellHeight * 0.5)
            let x2 = x1 + (cellWidth * 0.3) * Math.cos(angleRadians);
            let y2 = y1 + (cellHeight * 0.3) * Math.sin(angleRadians);
            
            // Set explicit stroke color and weight before drawing the line
            gridLayer.stroke("#D6CFB4");
            gridLayer.strokeWeight(1);
            
            // Draw the line
            gridLayer.line(x1, y1, x2, y2);
  
            // gridLayer.line(x, y, x1, y1);
          }
        }
      }

      // After drawing the vector field, handle particles
      
      // Chance to spawn a new particle
      if (p.random(100) < 100/particleFrequency) {
        // Create particle at random position
        particles.push(createParticle(
          p.random(startX, endX),
          p.random(startY, endY)
        ));
      }
      
      // Maximum number of particles - now from parameters
      while (particles.length > parameterStore.particleMaxCount) {
        particles.shift(); // Remove oldest particles if we have too many
      }
      
      // Draw particles to the particle layer
      particleLayer.push();
      particleLayer.noStroke();
      particleLayer.blendMode(p.REMOVE as any);

      // draw a rectangle over the whole canvase with the trail transparency
      // particleLayer.tint(255,parameterStore.trailTransparency);
      particleLayer.fill("#FFFFFF" + parameterStore.trailTransparency.toString(16).padStart(2, '0'));
      // particleLayer.fill("#FFFFFF04");

      particleLayer.rect(-particleLayer.width/2, -particleLayer.height/2, particleLayer.width, particleLayer.height);
      
      // Update and draw all particles on the particle layer
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        // calculate which grid cell the particle is in
        let cellX = Math.floor((particle.pos.x + p.width/2) / cellWidth);
        let cellY = Math.floor((particle.pos.y + p.height/2) / cellHeight);
        // console.log("particle:", i, "cell:", cellX, cellY);
        // adjust cells for inset
        cellX -= insetCells;
        cellY -= insetCells;
        // console.log("adjusted cell:", cellX, cellY);
        
        // Get noise angle at current position (same as in the grid)
        let noiseValue = p.noise(
          (particle.pos.x + noiseOffsetX) * noiseScale, 
          (particle.pos.y + noiseOffsetY) * noiseScale, 
          time
        );
        let angleRadians = 2 * noiseValue * Math.PI * 2;
        
        // Update particle physics based on flow field (only update velocity if the particle is in a cell that is part of the qr code)
        if (cellX >= 0 && cellX <= 24 && cellY >= 0 && cellY <= 24) {
          updateParticle(particle, angleRadians, true);
        } else {
          updateParticle(particle, angleRadians, false);
        }
        
        // Draw the particle on the particle layer
        particleLayer.blendMode(p.BLEND);

        // let particleColor = "#F05D5E";
        let particleColor = "#C77986";
        // if the particle is in a cell that is part of the qr code and has value true, use a different color
        let cellValue = qrData[25 * cellX + cellY];
        if (!(cellX >= 0 && cellX <= 24 && cellY >= 0 && cellY <= 24)) {
          particleColor = "#A188A6";
        } else if (cellValue) {
          particleColor = "#0091AD";
        }

        particleLayer.fill(particleColor);
        particleLayer.stroke(particleColor);
        particleLayer.strokeWeight(parameterStore.particleTrailWeight); // Adjustable trail weight
        particleLayer.line(
          particle.prevPos.x, particle.prevPos.y,
          particle.pos.x, particle.pos.y
        );
        
        particleLayer.noStroke();
        particleLayer.fill(particleColor);
        particleLayer.circle(particle.pos.x, particle.pos.y, parameterStore.particleTrailWeight);
      }
      particleLayer.pop();
      
      // Overlay the particle layer on the main canvas
      p.push();
      p.translate(-p.width/2, -p.height/2); // Move to top-left for image drawing
      p.imageMode(p.CORNER);
      p.blendMode(p.BLEND);
      p.image(gridLayer, 0, 0, p.width, p.height);
      // p.image(qrImage, startX, startY, endX - startX, endY - startY);
      // p.image(qrImage, 0,0, p.width, p.height);

      // iterate over the qrData array and draw a red circle for each true value
      // for (let x = 0; x < 25; x++) {
      //   for (let y = 0; y < 25; y++) {
      //     if (qrData[25 * x + y]) {
      //       let xSize = p.width / 25;
      //       let ySize = p.height / 25;
      //       p.noStroke();
      //       p.fill("#8D0B41");
      //       p.circle((x + 0.5) * xSize, (y + 0.5) * ySize, xSize);
      //     }
      //   }
      // }

      p.image(particleLayer, 0, 0, p.width, p.height);
      p.pop();
    };
  };
}
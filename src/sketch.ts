import p5 from "p5";

// Parameter definitions moved from main.tsx to here
export const numericParameterDefs = {
  "timeMultiplier": {
    "min": 0,
    "max": 0.01,
    "step": 0.00001,
    "defaultValue": 0.00005, // Set to match initial value
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
    "defaultValue": 0.1,
  },
  "noiseDetailOctave": {
    "min": 0,
    "max": 10,
    "step": 1,
    "defaultValue": 2,
  },
  "noiseDetailFalloff": {
    "min": 0,
    "max": 1,
    "step": 0.05,
    "defaultValue": 0.55,
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
    "defaultValue": 3,
  },
  "trailTransparency": {
    "min": 0,
    "max": 255,
    "step": 1,
    "defaultValue": 12,
  },
  "gridSize": {
    "min": 10,
    "max": 50,
    "step": 1,
    "defaultValue": 25,
  },
  // New parameters for particle behavior
  "particleMaxCount": {
    "min": 0,
    "max": 50, 
    "step": 1,
    "defaultValue": 4,
  },
  "particleForceStrength": {
    "min": 0.01,
    "max": 0.5,
    "step": 0.01,
    "defaultValue": 0.13,
  },
  "particleMaxSpeed": {
    "min": 0.5,
    "max": 5,
    "step": 0.1,
    "defaultValue": 2.0,
  },
  "particleTrailWeight": {
    "min": 1,
    "max": 5,
    "step": 0.5,
    "defaultValue": 1,
  },
  // New parameter for configurable lines per region
  "linesPerRegion": {
    "min": 1,
    "max": 10,
    "step": 1,
    "defaultValue": 3, // Default to current behavior (2 lines)
  },
  // New parameters for line length control
  "lineMinLength": {
    "min": 10,
    "max": 200,
    "step": 5,
    "defaultValue": 20, // Default to current hardcoded value
  },
  "lineMaxLength": {
    "min": 50,
    "max": 400,
    "step": 5,
    "defaultValue": 120, // Default maximum length
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
    let startTime = p.millis();
    // Create a separate graphics layer for particles
    let particleLayer: p5.Graphics;
    let lineLayer: p5.Graphics;
    let regions: any[];
    let lines: any[];
    let lineStepFactor: any[];
    let lineColors: any[];

    // Improved particle structure with vectors and previous position
    interface SimpleParticle {
      pos: p5.Vector;
      vel: p5.Vector;
      acc: p5.Vector;
      prevPos: p5.Vector;
    }

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
      
      // // Handle edges by wrapping around
      // if (particle.pos.x < -p.width/2) {
      //   particle.pos.x = p.width/2;
      //   particle.prevPos.x = p.width/2;
      // }
      // if (particle.pos.x > p.width/2) {
      //   particle.pos.x = -p.width/2;
      //   particle.prevPos.x = -p.width/2;
      // }
      // if (particle.pos.y < -p.height/2) {
      //   particle.pos.y = p.height/2;
      //   particle.prevPos.y = p.height/2;
      // }
      // if (particle.pos.y > p.height/2) {
      //   particle.pos.y = -p.height/2;
      //   particle.prevPos.y = -p.height/2;
      // }

      // // Handle edges by wrapping around
      if (particle.pos.x < 0) {
        particle.pos.x = p.width;
        particle.prevPos.x = p.width;
      }
      if (particle.pos.x > p.width) {
        particle.pos.x = 0;
        particle.prevPos.x = 0;
      }
      if (particle.pos.y < 0) {
        particle.pos.y = p.height;
        particle.prevPos.y = p.height;
      }
      if (particle.pos.y > p.height) {
        particle.pos.y = 0;
        particle.prevPos.y = 0;
      }

    }
    

    // Array to store particles
    let particles: SimpleParticle[] = [];
    
    // Grid variables moved to outer scope
    let squares: { x: number, y: number, size: number }[] = []; // Remove color from type
    let square_colors = ["#F0EEE8", "#FBF5E5", "#FFFAEC", "#F5ECD5", "#F5F5F5"];
    const squareSize = 40;
    
    // Helper function moved to outer scope
    function isInsideAnyRegion(x: number, y: number, size: number): boolean {
      for (let r = 0; r < regions.length; r++) {
        let region = regions[r];
        // Check if square overlaps with region
        if (!(x + size <= region[0] || x >= region[2] || 
              y + size <= region[1] || y >= region[3])) {
          return true;
        }
      }
      return false;
    }

    // Function to generate a single line within a region
    function generateLine(region: number[]): [number, number, number, number, number, number, number] {
      const minLineLength = parameterStore.lineMinLength;
      const maxLineLength = parameterStore.lineMaxLength;
      
      let line_dist = 0;
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
      let attempts = 0;
      const maxAttempts = 50;
      
      // Try to generate line within length constraints
      while ((line_dist < minLineLength || line_dist > maxLineLength) && attempts < maxAttempts) {
        x1 = p.random(region[0] + 25, region[2] - 25);
        y1 = p.random(region[1] + 25, region[3] - 25);
        x2 = p.random(region[0] + 25, region[2] - 25);
        y2 = p.random(region[1] + 25, region[3] - 25);
        line_dist = p.dist(x1, y1, x2, y2);
        attempts++;
      }
      
      // If we couldn't find a suitable line, use whatever we have
      if (attempts >= maxAttempts) {
        x1 = p.random(region[0] + 25, region[2] - 25);
        y1 = p.random(region[1] + 25, region[3] - 25);
        x2 = p.random(region[0] + 25, region[2] - 25);
        y2 = p.random(region[1] + 25, region[3] - 25);
      }
      
      // Generate random delay between 500-10000ms
      const delay = p.random(500, 1000);
      
      // Generate random duration between 3000-9000ms
      const duration = p.random(1000, 4000);
      
      // Current time in milliseconds
      const startTime = p.millis();
      
      return [x1, y1, x2, y2, delay, duration, startTime];
    }    

    // Function to draw a single line step
    function drawLineStep(
      p: p5,
      x1: number, y1: number, x2: number, y2: number,
      i: number, steps: number, 
      time: number, 
      lineColor: p5.Color,
      lineStepFreq: number
    ): void {
      let x = p.lerp(x1, x2, i/steps);
      let y = p.lerp(y1, y2, i/steps);
      let angle = p.atan2(y2 - y1, x2 - x1);
      let perpAngle = angle + p.PI/2;

      // Simple soft absolute value function - smooth everywhere
      let smoothAbsNoise = (noiseVal: number): number => {
        // Shift noise to be centered at 0
        let centered = noiseVal - 0.5;
        
        // Soft absolute value using sqrt(x² + ε)
        let epsilon = 0.01; // Controls smoothness at zero
        return Math.sqrt(centered * centered + epsilon);
      };
      
      let noise1 = smoothAbsNoise(p.noise(x * 0.008, i * 0.002, time * 0.1));
      let noise2 = noise1 + smoothAbsNoise(p.noise(x * 0.008, i * 0.002, (time + 2054) * 0.001));
      let blendFactor = 1.0;
      let blendedNoise1 = noise1;
      
      if (i < steps * 0.1) {
        // Cubic ease-in-out for first 10%
        let t = i / (steps * 0.1);
        // Cubic ease-in-out formula
        blendFactor = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      } else if (i > steps * 0.9) {
        // Cubic ease-in-out for last 10%
        let t = (steps - i) / (steps * 0.1);
        // Cubic ease-in-out formula
        blendFactor = 1.0;
        let blendOutFactor = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        blendedNoise1 = p.lerp(noise2, noise1, blendOutFactor);
      }
      
      let blendedNoise = p.lerp(noise1, noise2, blendFactor);
      let xNoise1 = Math.cos(perpAngle) * blendedNoise1 * 100;
      let yNoise1 = Math.sin(perpAngle) * blendedNoise1 * 100;
      let xNoise2 = Math.cos(perpAngle) * blendedNoise * 100;
      let yNoise2 = Math.sin(perpAngle) * blendedNoise * 100;
      
      p.fill(lineColor);
      p.circle(x + xNoise1, y + yNoise1, 1);
      p.circle(x + xNoise2, y + yNoise2, 1);
      p.strokeWeight(noise1 * 3);
      p.stroke(lineColor);

      if (i % lineStepFreq == 0) {
        p.line(x + xNoise1, y + yNoise1, x + xNoise2, y + yNoise2);
      }
    }

    p.preload = function() {
      // can preload assets here...
      font = p.loadFont(
        new URL("/public/fonts/inconsolata.otf", import.meta.url).href
      );
    };
    
    p.setup = function() {
      // Keep the fixed dimensions - this is the actual size of your visualization
      p.createCanvas(1080, 1920, p.WEBGL);
      p.translate(-p.width/2, -p.height/2); // Move to top-left for image drawing
      
      // Create particle layer with same dimensions and renderer
      particleLayer = p.createGraphics(1080, 1920, p.WEBGL);
      particleLayer.setAttributes({ alpha: true });
      particleLayer.translate(-p.width/2, -p.height/2);
      lineLayer = p.createGraphics(1080, 1920, p.WEBGL);   
      lineLayer.setAttributes({ alpha: true });
      lineLayer.translate(-p.width/2, -p.height/2);

      regions = [  // 4 regions, scaled for 1080 x 1920 canvas, coordinates as multiples of 20
        [140, 160, 940, 460],   // Region 1: 800px width × 300px height
        [140, 600, 940, 900],   // Region 2: 800px width × 300px height
        [140, 1040, 940, 1340], // Region 3: 800px width × 300px height
        [140, 1480, 940, 1780]  // Region 4: 800px width × 300px height
      ]
      lines = [];
      lineStepFactor = [];
      

      
      for (let r = 0; r < regions.length; r++) {
        const region = regions[r];
        const linesPerRegion = Math.floor(parameterStore.linesPerRegion);
        
        // Generate lines for this region
        for (let lineIndex = 0; lineIndex < linesPerRegion; lineIndex++) {
          // Generate line and add to lines array
          const line = generateLine(region);
          lines.push(line);
          lineStepFactor.push(p.random(1, 5));
        }
      }

      // draw a rectangle around each region
      for (let r = 0; r < regions.length; r++) {
        let region = regions[r];
        p.stroke("#2C3639");
        p.strokeWeight(2);
        p.fill("#FBF8EF04")
        p.rect(region[0], region[1], region[2] - region[0], region[3] - region[1]);
      }
      
      // let's populate lineColors with random lerps between black and 4C585B
      lineColors = [];
      for (let i = 0; i < lines.length; i++) {
        lineColors.push(p.color(0));
        lineColors.push(p.lerpColor(p.color(0), p.color("#363030"), p.random(0, 1)));

        // lineColors.push(p.lerpColor(p.color(0), p.color("#2C3639"), p.random(0, 1)));
      }
      
      // Generate grid squares positions only - moved from draw()
      // Create grid covering the entire canvas
      for (let x = 0; x < p.width; x += squareSize) {
        for (let y = 0; y < p.height; y += squareSize) {
          if (!isInsideAnyRegion(x, y, squareSize)) {
            // Only store position information
            squares.push({
              x: x,
              y: y,
              size: squareSize
            });
          }
        }
      }

      // Initialize particles array
      particles = [];
    }
    

    let frameCount = 0;
    let prevTime = 0;
    p.draw = function() {
      frameCount++;

      // Simulate consistent 60fps timing instead of using actual millis
      const frameRate = 60; // Simulate 60fps
      const deltaTimePerFrame = 1000 / frameRate; // ms per frame at 60fps
      const currentTime = frameCount * deltaTimePerFrame;
      
      p.translate(-p.width/2, -p.height/2);
      if (frameCount % 5 == 0) {
        // draw a white rectangle over the entire canvas
        p.blendMode(p.ADD as any);
        p.fill("#FFFFFF02");
        p.rect(0,0, p.width, p.height);
        p.blendMode(p.BLEND as any);
      }

      // particleLayer.translate(-p.width/2, -p.height/2);
      let time = startTime;
      time = frameCount * 0;
      
      // Clear the particle layer with semi-transparent background for trail effect
      particleLayer.push();
      particleLayer.noStroke();
      // Create fading effect with trailTransparency parameter
      particleLayer.blendMode(p.REMOVE as any);
      particleLayer.fill("#FFFFFF" + parameterStore.trailTransparency.toString(16).padStart(2, '0'));
      particleLayer.rect(0,0, particleLayer.width, particleLayer.height);
      particleLayer.pop();

      lineLayer.push();
      lineLayer.noStroke();
      lineLayer.blendMode(p.REMOVE as any);
      lineLayer.fill("#000000" + parameterStore.gridTransparency.toString(16).padStart(2, '0'));
      lineLayer.rect(0,0, lineLayer.width, lineLayer.height);
      lineLayer.blendMode(p.BLEND as any);
      lineLayer.pop();


      // draw a rectangle around each region
      for (let r = 0; r < regions.length; r++) {
        let region = regions[r];
        p.blendMode(p.SCREEN as any);
        // p.noStroke();
        // p.fill("#FBF8EF04")
        // p.rect(region[0], region[1], region[2] - region[0], region[3] - region[1]);
        p.blendMode(p.BLEND as any);
        p.stroke("#2C3639");
        p.strokeWeight(2);
        p.fill("#FBF8EF48")

        p.rect(region[0], region[1], region[2] - region[0], region[3] - region[1]);
      }

      // Get simulated time instead of actual millis for line lifetimes
      // const currentTime = p.millis();

      // Update our lines array to match the desired linesPerRegion parameter
      const desiredLinesPerRegion = Math.floor(parameterStore.linesPerRegion);
      
      // Count current lines per region
      let linesInRegion = new Array(regions.length).fill(0);
      
      // Associate each line with its region
      let lineRegionMap = new Array(lines.length);
      for (let l = 0; l < lines.length; l++) {
        let x1 = lines[l][0];
        let y1 = lines[l][1];
        let found = false;
        
        for (let r = 0; r < regions.length; r++) {
          const region = regions[r];
          if (x1 >= region[0] && x1 <= region[2] && y1 >= region[1] && y1 <= region[3]) {
            linesInRegion[r]++;
            lineRegionMap[l] = r;
            found = true;
            break;
          }
        }
        
        if (!found) {
          // Fallback if line isn't in any region
          lineRegionMap[l] = -1;
        }
      }
      
      // Add or remove lines as needed
      for (let r = 0; r < regions.length; r++) {
        // If we need more lines in this region
        while (linesInRegion[r] < desiredLinesPerRegion) {
          const newLine = generateLine(regions[r]);
          lines.push(newLine);
          lineStepFactor.push(p.random(10, 40));
          lineColors.push(p.lerpColor(p.color(0), p.color("#2C3639"), p.random(0, 1)));
          linesInRegion[r]++;
        }
        
        // If we need fewer lines in this region
        if (linesInRegion[r] > desiredLinesPerRegion) {
          // Find and remove excess lines from this region (from the end)
          for (let l = lines.length - 1; l >= 0; l--) {
            if (lineRegionMap[l] === r && linesInRegion[r] > desiredLinesPerRegion) {
              lines.splice(l, 1);
              lineStepFactor.splice(l, 1);
              lineColors.splice(l, 1);
              linesInRegion[r]--;
              lineRegionMap.splice(l, 1);
            }
          }
        }
      }

      for (let l = 0; l < lines.length; l++) {
        let x1 = lines[l][0];
        let y1 = lines[l][1];
        let x2 = lines[l][2];
        let y2 = lines[l][3];
        let delay = lines[l][4];      // Delay before appearing
        let duration = lines[l][5];   // How long the line exists
        let startTime = lines[l][6];  // When the line was created
        
        // Check if this line has exceeded its lifetime
        if (currentTime > startTime + delay + duration) {
          // Find which region this line belongs to
          let lineRegion = null;
          for (let r = 0; r < regions.length; r++) {
            const region = regions[r];
            // Check if line's endpoints are inside this region
            if (x1 >= region[0] && x1 <= region[2] && y1 >= region[1] && y1 <= region[3]) {
              lineRegion = region;
              break;
            }
          }
          
          // If we found the region, generate a new line
          if (lineRegion) {
            const newLine = generateLine(lineRegion);
            lines[l] = newLine;
            lineStepFactor[l] = p.random(10, 40);
            
            // Update local variables to the new line
            x1 = newLine[0];
            y1 = newLine[1];
            x2 = newLine[2];
            y2 = newLine[3];
            delay = newLine[4];
            duration = newLine[5];
            startTime = newLine[6];
          }
        }
        
        // Only draw the line if it's within its visible phase
        // Also detect when a line crosses the activation threshold
        const lineStartTime = startTime + delay;
        const lineEndTime = startTime + delay + duration;
        const justActivated = prevTime < lineStartTime && currentTime >= lineStartTime;


        if ((currentTime >= lineStartTime && currentTime <= lineEndTime) || justActivated) {
          // Drawing code for the line
          let steps = 500;
          p.noiseDetail(2, 0.5);

          let line_length = p.dist(x1, y1, x2, y2);
          let lineStepFreq = Math.ceil((200 / line_length) * lineStepFactor[l]);

          // Calculate progress based on both current and previous frame time
          const prevProgress = Math.max(0, Math.min(1, (prevTime - lineStartTime) / duration));
          const currentProgress = Math.max(0, Math.min(1, (currentTime - lineStartTime) / duration));
          
          // Calculate step ranges - what we've already drawn and what to draw now
          const prevStepsDrawn = Math.floor(steps * prevProgress);
          const currentStepsToDraw = Math.floor(steps * currentProgress);
          
          // Only draw the steps that are new since last frame
          for (let i = prevStepsDrawn; i < currentStepsToDraw; i++) {
            drawLineStep(
              lineLayer, 
              x1, y1, x2, y2, 
              i, steps, 
              time, 
              lineColors[l], 
              lineStepFreq
            );
          }
        }
      }   

      // Particle creation - chance to spawn a new particle based on frequency
      if (p.random(100) < parameterStore.particleFrequency) {
        if (particles.length < parameterStore.particleMaxCount) {
          // Create particle at random position
          particles.push(createParticle(
            p.random(-p.width/2, p.width/2),
            p.random(-p.height/2, p.height/2)
          ));
        }
      }
      
      // Limit maximum number of particles
      // while (particles.length > parameterStore.particleMaxCount) {
      //   particles.shift(); // Remove oldest particles if we have too many
      // }
      
      // Update and draw all particles on the particle layer
      particleLayer.push();
      particleLayer.blendMode(p.BLEND);
      
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // Get noise angle at current position for flow field
        let noiseValue = p.noise(
          (particle.pos.x + p.width/2) * parameterStore.noiseScale, 
          (particle.pos.y + p.height/2) * parameterStore.noiseScale, 
          time * parameterStore.timeMultiplier
        );
        let angleRadians = 2 * noiseValue * Math.PI * 2;
        
        // Update particle physics based on flow field
        updateParticle(particle, angleRadians);

        let insideRegion = false;

        let innerSquarePalette = ["#F5ECD5", "#0E3D28", "#002914", "#2A390D", "#333333"]
        //if the particle is inside of a region, draw a 5x5 square aligned with the region
        for (let r = 0; r < regions.length; r++) {
          let region = regions[r];
          // Convert particle position from WEBGL to translated coordinates for comparison
          // let translatedX = particle.pos.x + p.width/2;
          // let translatedY = particle.pos.y + p.height/2;
          let translatedX = particle.pos.x;
          let translatedY = particle.pos.y;
          if (translatedX >= region[0] && translatedX <= region[2] && 
              translatedY >= region[1] && translatedY <= region[3]) {
            // quantize the particle position to the nearest 5x5 square
            let sqX = Math.floor(particle.pos.x / 10) * 10;
            let sqY = Math.floor(particle.pos.y / 10) * 10;
            // use noise to determine the color of the square
            let noiseVal = p.noise(sqX * 0.01, sqY * 0.01, time * 0.01);
            let colorIndex = Math.floor(noiseVal * innerSquarePalette.length);
            // p.noStroke();
            // p.fill(innerSquarePalette[colorIndex] + "40");
            // p.rect(sqX, sqY, 10, 10);
            insideRegion = true;
          }
        }



        if (!insideRegion) {
          // // Draw the particle on the particle layer - simple white particles
          particleLayer.stroke("#000000");
          particleLayer.strokeWeight(parameterStore.particleTrailWeight);
          particleLayer.line(
            particle.prevPos.x, particle.prevPos.y,
            particle.pos.x, particle.pos.y
          );
        }
        
        // particleLayer.noStroke();
        // particleLayer.fill("#000000");
        // particleLayer.circle(particle.pos.x, particle.pos.y, parameterStore.particleTrailWeight);


      }
      particleLayer.pop();

      // Draw all squares - calculate colors dynamically each frame
      p.noStroke();
      for (let i = 0; i < squares.length; i++) {
        let sq = squares[i];
        // Calculate color based on noise that changes each frame
        let noiseVal = p.noise(sq.x * 0.01, sq.y * 0.01, frameCount * 0.005);
        let colorIndex = Math.floor(noiseVal * square_colors.length);
        p.fill(square_colors[colorIndex]);
        p.rect(sq.x, sq.y, sq.size, sq.size);
      }
      
      // Overlay the particle layer on the main canvas after drawing lines but before squares
      p.push();
      p.imageMode(p.CORNER);
      p.blendMode(p.BLEND as any);
      p.image(particleLayer, 0, 0, p.width, p.height);
      p.blendMode(p.BLEND as any);
      p.image(lineLayer, 0, 0, p.width, p.height);
      p.blendMode(p.BLEND as any);
      p.pop();
      
      prevTime = currentTime - deltaTimePerFrame; // Previous frame's simulated time
    };
  };
}
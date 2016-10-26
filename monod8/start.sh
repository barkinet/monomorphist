#!/bin/bash
cd /io

d8 --trace_hydrogen --trace_phase=Z --trace_deopt \
    --code_comments --hydrogen_track_positions --redirect_code_traces \
    --redirect_code_traces_to=/io/code.asm --print_opt_code code.js

gzip hydrogen.cfg || touch no_hydrogen_output
gzip code.asm || touch no_asm_output